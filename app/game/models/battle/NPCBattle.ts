import { IBattleGround } from "./IBattleGround";
import { IUnit } from "../units/IUnit";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter = require("events");
import { BattleEvents } from "./BattleEvents";
import { PlayerModel } from "../../../database/players/players.model";
import { INPCUnit } from "../units/INPCUnit";
import { getRandomInt, sleep } from "../../../utils/utils";
import { logger } from "../../../utils/logger";
import { CallbackActions } from "../../misc/CallbackConstants";
import { CallbackData } from "../CallbackData";
import { IPlayerDocument, IPlayer } from "../../../database/players/players.types";
import { BattleLog } from "./BattleLog";
import { Enemy } from "../units/Enemy";
import { GameParams } from "../../misc/GameParameters";

export enum SIDE {
  A,
  B,
}
const UPDATE_DELAY = 5000;
const LEAVE_DELAY = 5 * 60 * 1000;

export class NPCBattle extends EventEmitter.EventEmitter implements IBattleGround {
  id: number;
  chatId: number;
  bot: TelegramBot;
  teamA: IUnit[];
  teamB: IUnit[];
  battleLog: BattleLog;
  updateTimer?: NodeJS.Timeout;
  leaveBattleTimer?: NodeJS.Timeout;
  message?: TelegramBot.Message;
  previousMessageText?: string;
  lastHitBy?: IUnit;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super();
    this.id = Date.now();
    this.chatId = chatId;
    this.bot = bot;

    this.teamA = [];
    this.teamB = [];
    this.battleLog = new BattleLog();

    this.addListener(BattleEvents.UPDATE_MESSAGE, this.handleUpdate);
    this.updateTimer = setInterval(() => this.emit(BattleEvents.UPDATE_MESSAGE), UPDATE_DELAY);
    this.addListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    this.leaveBattleTimer = setInterval(() => this.emit(BattleEvents.LEAVE_BATTLE), LEAVE_DELAY);
  }

  addToPlayersTeam = (unit: IUnit) => {
    this.teamA.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
  };

  addToNPCTeam = (unit: INPCUnit) => {
    this.teamB.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
  };

  startBattle = async () => {
    if (this.teamA.length > 0) {
      this.cleanLeaveBattleListener();
      this.teamA.forEach((unit) => {
        this.battleLog.foundUnit(unit);
      });
    }
    this.sendBattleMessage();
    this.startFight();
  };

  endBattle = async () => {
    logger.debug("Battle ends, cleaning up...");
    this.battleLog.battleEnd(this.isAnyoneAlive(this.teamA) ? SIDE.A : SIDE.B);
    this.cleanUp();
    this.handleUpdate(true);
    this.emit(BattleEvents.BATTLE_ENDED);
    this.removeAllListeners();
  };

  leaveBattle = () => {
    this.teamB.forEach((unit) => {
      this.battleLog.leftBattle(unit);
    });
    this.endBattle();
  };

  startFight = () => {
    [...this.teamA, ...this.teamB].forEach((unit) => {
      logger.debug("Starting fight");

      unit.startAttacking();
    });
  };

  handleAttack = async (unit: IUnit) => {
    logger.debug("Handling attack by " + unit.getName());

    // Handle attack only if there are units on both sides
    if (this.isAnyoneAlive(this.teamA) && this.isAnyoneAlive(this.teamB)) {
      const isUnitTeamA = this.teamA.includes(unit);

      let target: IUnit;
      // Picks random ALIVE target
      do {
        if (isUnitTeamA) {
          target = this.teamB[getRandomInt(0, this.teamB.length)];
        } else {
          target = this.teamA[getRandomInt(0, this.teamA.length)];
        }
      } while (!target.isAlive());

      // Hadnles attack
      const dmgDealt = unit.attack(target);
      this.lastHitBy = unit;

      this.battleLog.attacked(unit, target, dmgDealt, isUnitTeamA ? "🔹" : "🔸");

      // Records target's death
      if (!target.isAlive()) {
        logger.debug(`${target.getName()} died`);

        this.battleLog.killed(unit, target);

        if (isUnitTeamA) {
          await this.rewardPlayers(target as Enemy, unit);
        }

        this.cleanUpUnit(target);
      }

      // End battle if there are no alive units on any side
      if (!(this.isAnyoneAlive(this.teamA) && this.isAnyoneAlive(this.teamB))) {
        logger.debug(`No one is alive in one of the teams, ending the battle`);

        this.endBattle();
      }
    }
  };

  sendBattleMessage = async () => {
    const callbackData = new CallbackData({
      action: CallbackActions.JOIN_FIGHT,
      telegram_id: undefined,
      payload: this.id,
    });

    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Join fight",
              callback_data: callbackData.toJson(),
            },
          ],
        ],
      },
    };

    const messageText = `${this.getBattleInfo()}\n\n${
      this.battleLog.hasRecords() ? this.battleLog.getBattleLog() : ""
    }`;
    this.previousMessageText = messageText;
    this.message = await this.bot.sendMessage(this.chatId, messageText, opts);

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const callbackData = CallbackData.fromJson(callbackQuery.data);

    if (callbackData.payload === this.id && callbackData.action === CallbackActions.JOIN_FIGHT) {
      const player = await PlayerModel.findPlayer({
        telegram_id: callbackQuery.from.id,
        chat_id: this.chatId,
      });

      if (player !== undefined) {
        if (
          Math.abs(player.level - this.getAverageLevel(SIDE.B)) >
          GameParams.ALLOWED_LEVEL_DIFFERENCE
        ) {
          const optsCall: TelegramBot.AnswerCallbackQueryOptions = {
            callback_query_id: callbackQuery.id,
            text: "Level difference must be 5 or less",
            show_alert: false,
          };
          this.bot.answerCallbackQuery(optsCall);
          return;
        }
        if (
          this.teamA.findIndex((unit) => {
            return (
              (unit as IPlayerDocument).telegram_id === player?.telegram_id &&
              (unit as IPlayerDocument).chat_id === player.chat_id
            );
          }) !== -1
        ) {
          const optsCall: TelegramBot.AnswerCallbackQueryOptions = {
            callback_query_id: callbackQuery.id,
            text: "You are in the fight",
            show_alert: false,
          };
          this.bot.answerCallbackQuery(optsCall);
          return;
        } else {
          let optsCall: TelegramBot.AnswerCallbackQueryOptions;
          if (player.isAlive()) {
            this.cleanLeaveBattleListener();
            this.addToPlayersTeam(player);
            player.startAttacking();
            this.battleLog.unitJoined(player);
            logger.verbose(`Player ${player?.name} joined the fight in ${this.chatId}`);
            optsCall = {
              callback_query_id: callbackQuery.id,
              text: "You joined the fight",
              show_alert: false,
            };
          } else {
            optsCall = {
              callback_query_id: callbackQuery.id,
              text: "You are DEAD",
              show_alert: false,
            };
          }
          this.bot.answerCallbackQuery(optsCall);
        }
      }
    }
  };

  handleUpdate = (hideMarkup: boolean = false) => {
    if (this.message !== undefined) {
      const callbackData = new CallbackData({
        action: CallbackActions.JOIN_FIGHT,
        telegram_id: undefined,
        payload: this.id,
      });

      const opts: TelegramBot.EditMessageTextOptions = {
        parse_mode: "HTML",
        chat_id: this.chatId,
        message_id: this.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Join fight",
                callback_data: callbackData.toJson(),
              },
            ],
          ],
        },
      };

      if (hideMarkup) {
        delete opts.reply_markup;
      }

      const messageText = `${this.getBattleInfo()}\n\n${
        this.battleLog.hasRecords() ? this.battleLog.getBattleLog() : ""
      }`;
      // Only edit message if the text actually changed
      if (this.previousMessageText !== messageText) {
        this.previousMessageText = messageText;
        this.bot.editMessageText(messageText, opts);
      }
    }
  };

  getBattleInfo = (): string => {
    let battleInfoText = `<pre>     </pre><b>⚜️BATTLE⚜️</b>\n\n`;
    battleInfoText += `<b>Side</b> 🟠\n`;
    this.teamB.forEach((unit) => {
      battleInfoText += `➣ ${unit.getShortStats(!unit.isAlive())}\n`;
    });
    battleInfoText += `\n<pre>     </pre><b>⚔️VERSUS ⚔️</b>\n\n`;
    battleInfoText += `<b>Side</b> 🔵\n`;
    if (this.teamA.length === 0) {
      battleInfoText += `<pre>  </pre><i>Press 'Join fight' to join Side 🔵</i>`;
    }
    this.teamA.forEach((unit) => {
      battleInfoText += `➣ ${unit.getShortStats(!unit.isAlive())}\n`;
    });
    return battleInfoText;
  };

  cleanUpUnit = (unit: IUnit) => {
    unit.stopAttacking();
    unit.removeAllListeners();
  };

  cleanLeaveBattleListener = () => {
    this.removeListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    if (this.leaveBattleTimer) {
      clearInterval(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  cleanUp = () => {
    this.bot.removeListener("callback_query", this.onJoinCallbackQuery);
    [...this.teamB, ...this.teamA].forEach((unit) => {
      logger.debug("Cleaning up " + unit.getName());
      this.cleanUpUnit(unit);
    });
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    if (this.leaveBattleTimer) {
      clearInterval(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  isAnyoneAlive = (units: IUnit[]): boolean => {
    logger.debug(`${units.some((unit) => unit.isAlive())} is anyone alive`);
    return units.some((unit) => unit.isAlive());
  };

  getRandomUnit = (side: SIDE, isAlive: boolean = false): IUnit => {
    let unit: IUnit;

    switch (side) {
      case SIDE.A: {
        do {
          unit = this.teamA[getRandomInt(0, this.teamA.length)];
        } while (isAlive && this.isAnyoneAlive(this.teamA) && !unit.isAlive());
        break;
      }
      case SIDE.B: {
        do {
          unit = this.teamB[getRandomInt(0, this.teamB.length)];
        } while (isAlive && this.isAnyoneAlive(this.teamB) && !unit.isAlive());
        break;
      }
    }

    return unit;
  };

  getNumberOfAliveUnits = (side: SIDE): number => {
    let count = 0;
    switch (side) {
      case SIDE.A: {
        this.teamA.forEach((unit) => {
          if (unit.isAlive()) {
            count++;
          }
        });
        break;
      }
      case SIDE.B: {
        this.teamB.forEach((unit) => {
          if (unit.isAlive()) {
            count++;
          }
        });
        break;
      }
    }

    return count;
  };

  getAverageLevel = (side: SIDE) => {
    let averageLevel = 0;
    switch (side) {
      case SIDE.A: {
        this.teamA.forEach((unit) => (averageLevel += unit.level));
        averageLevel = Math.round(averageLevel / this.teamA.length);
        break;
      }
      case SIDE.B: {
        this.teamB.forEach((unit) => (averageLevel += unit.level));
        averageLevel = Math.round(averageLevel / this.teamB.length);
        break;
      }
    }
    return averageLevel;
  };

  rewardPlayers = async (unitKilled: Enemy, lastHitBy: IUnit) => {
    this.battleLog.rewardsFrom(unitKilled);
    logger.debug(`rewarding for kill`);
    const money = unitKilled.moneyOnDeath;
    const exp = unitKilled.expOnDeath;

    const numberAlive = this.getNumberOfAliveUnits(SIDE.A);
    logger.debug(`Alive ${numberAlive}`);

    if (numberAlive === 1) {
      (lastHitBy as IPlayerDocument).gainXP(exp);
      (lastHitBy as IPlayerDocument).money += money;

      await (lastHitBy as IPlayerDocument).saveWithRetries();
      this.battleLog.lastHitDrop(lastHitBy, unitKilled, exp, money);
    } else {
      const moneyLastHit = (money / numberAlive) * 1.1;
      const expLastHit = (exp / numberAlive) * 1.1;
      const moneyPerUnit = (money - moneyLastHit) / (numberAlive - 1);
      const expPerUnit = (exp - expLastHit) / (numberAlive - 1);

      const unitsRewarded = [];
      for (const unit of this.teamA) {
        if (unit.isAlive()) {
          if (unit === lastHitBy) {
            (unit as IPlayerDocument).gainXP(expLastHit);
            (unit as IPlayerDocument).money += moneyLastHit;
            this.battleLog.lastHitDrop(lastHitBy, unitKilled, expLastHit, moneyLastHit);
          } else {
            (unit as IPlayerDocument).gainXP(expPerUnit);
            (unit as IPlayerDocument).money += moneyPerUnit;
            unitsRewarded.push(unit);
          }
          await (unit as IPlayerDocument).saveWithRetries();
        }
      }
      this.battleLog.expMoneyDropped(unitsRewarded, expPerUnit, moneyPerUnit);
    }

    const itemDrop = unitKilled.itemDrop;

    if (itemDrop) {
      const rndUnit = this.getRandomUnit(SIDE.A, true);
      await (rndUnit as IPlayerDocument).addItemToInventory(itemDrop);
      await (rndUnit as IPlayerDocument).saveWithRetries();
      this.battleLog.itemDropped(rndUnit, itemDrop);
    }
  };
}
