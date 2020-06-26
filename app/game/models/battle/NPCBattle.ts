import { IBattleGround } from "./IBattleGround";
import { IUnit } from "../units/IUnit";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter = require("events");
import { BattleEvents } from "./BattleEvents";
import { PlayerModel } from "../../../database/players/players.model";
import { INPCUnit } from "../units/INPCUnit";
import { getRandomInt } from "../../../utils/utils";
import { logger } from "../../../utils/logger";
import { CallbackActions } from "../../misc/CallbackConstants";
import { CallbackData } from "../CallbackData";
import { IPlayerDocument } from "../../../database/players/players.types";
import { BattleLog } from "./BattleLog";

const UPDATE_DELAY = 5000;

export class NPCBattle extends EventEmitter.EventEmitter implements IBattleGround {
  id: number;
  chatId: number;
  bot: TelegramBot;
  teamA: IUnit[];
  teamB: IUnit[];
  battleLog: BattleLog;
  isPreFight: boolean = true;
  updateTimer?: NodeJS.Timeout;
  message?: TelegramBot.Message;
  previousMessageText?: string;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super();
    this.id = Date.now();
    this.chatId = chatId;
    this.bot = bot;

    this.teamA = [];
    this.teamB = [];
    this.battleLog = new BattleLog();

    this.addListener(BattleEvents.PLAYER_JOINED, this.startFight);
    this.addListener(BattleEvents.UPDATE_MESSAGE, this.handleUpdate);
    this.updateTimer = setInterval(() => this.emit(BattleEvents.UPDATE_MESSAGE), UPDATE_DELAY);
  }

  addToPlayersTeam = (unit: IUnit) => {
    this.teamA.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
    // Pre-fight ends when player joins the battle
    if (this.isPreFight) {
      this.isPreFight = false;
      this.emit(BattleEvents.PLAYER_JOINED);
    }
  };

  addToNPCTeam = (unit: INPCUnit) => {
    this.teamB.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
  };

  startBattle = () => {
    this.sendBattleMessage();
    this.startFight();
  };

  endBattle = () => {
    [...this.teamB, ...this.teamA].forEach((unit) => {
      unit.stopAttacking();
      unit.removeAllListeners();
    });
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    this.battleLog.addRecord("Fight ends here, give away rewards");
  };

  startFight = () => {
    this.removeListener(BattleEvents.PLAYER_JOINED, this.startFight);
    const isPreFight = this.teamA.length === 0;
    this.teamB.forEach((unit) => {
      if (isPreFight) {
        (unit as INPCUnit).startAttackingPreFight();
        logger.debug("Starting pre fight");
      } else {
        unit.startAttacking();
        logger.debug("Starting fight");
      }
    });
  };

  handleAttack = async (unit: IUnit) => {
    logger.debug("Handling attack by " + unit.getName());
    const isUnitTeamA = this.teamA.includes(unit);
    let target: IUnit;

    if (isUnitTeamA) {
      target = this.teamB[getRandomInt(0, this.teamA.length)];
    } else {
      if (this.isPreFight) {
        target = await PlayerModel.getRandomPlayer(this.chatId, true);
      } else {
        target = this.teamA[getRandomInt(0, this.teamA.length)];
      }
    }

    const dmgDealt = unit.attack(target);
    this.battleLog.attacked(unit, target, dmgDealt);

    if (!target.isAlive()) {
      if (isUnitTeamA) {
        this.teamB.splice(this.teamB.indexOf(target), 1);
      } else {
        this.teamA.splice(this.teamA.indexOf(target), 1);
      }
      this.battleLog.killed(unit, target);

      target.stopAttacking();
    }

    if (!this.isPreFight && (this.teamA.length === 0 || this.teamB.length === 0)) {
      this.endBattle();
    }
  };

  sendBattleMessage = async () => {
    const callbackData = new CallbackData({
      action: CallbackActions.JOIN_FIGHT,
      telegram_id: undefined,
      payload: this.id,
    });

    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "Markdown",
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

    this.message = await this.bot.sendMessage(this.chatId, this.getBattleInfo(), opts);

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const callbackData = CallbackData.fromJson(callbackQuery.data);

    if (callbackData.action === CallbackActions.JOIN_FIGHT) {
      const player = await await PlayerModel.findPlayer({
        telegram_id: callbackQuery.from.id,
        chat_id: this.chatId,
      });

      if (player !== undefined) {
        if (
          this.teamA.findIndex((unit) => {
            return (unit as IPlayerDocument).telegram_id === player?.telegram_id;
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
            // Stop auto-attacking all players
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

  handleUpdate = () => {
    if (this.message !== undefined) {
      const callbackData = new CallbackData({
        action: CallbackActions.JOIN_FIGHT,
        telegram_id: undefined,
        payload: this.id,
      });

      const opts: TelegramBot.EditMessageTextOptions = {
        parse_mode: "Markdown",
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

      //   if (hideMarkup) {
      //     delete opts.reply_markup;
      //   }

      const messageText = this.getBattleInfo() + "\n\n" + this.battleLog.getBattleLog();
      // Only edit message if the text actually changed
      if (this.previousMessageText !== messageText) {
        this.previousMessageText = messageText;
        this.bot.editMessageText(messageText, opts);
      }
    }
  };

  getBattleInfo = (): string => {
    let battleInfoText = `BATTLE\n`;
    this.teamB.forEach((unit) => {
      battleInfoText += `${unit.getShortStats()}\n`;
    });
    battleInfoText += "*VS*\n";
    this.teamA.forEach((unit) => {
      battleInfoText += `${unit.getShortStats()}\n`;
    });
    return battleInfoText;
  };
}
