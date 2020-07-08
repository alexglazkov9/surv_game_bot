import { IBattleGround } from "./IBattleGround";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter = require("events");

import { IUnit } from "../../units/IUnit";
import { BattleLog } from "../BattleLog";
import { BattleEvents } from "../BattleEvents";
import { CallbackData } from "../../CallbackData";
import { CallbackActions } from "../../../misc/CallbackConstants";
import { logger } from "../../../../utils/logger";
import { getRandomInt } from "../../../../utils/utils";

const UPDATE_DELAY = 5000;
export enum SIDE {
  GUEST,
  HOST,
}

export abstract class BattleGround extends EventEmitter.EventEmitter implements IBattleGround {
  id: number;
  chatId: number;
  bot: TelegramBot;
  teamGuest: IUnit[];
  teamHost: IUnit[];
  battleLog: BattleLog;
  updateTimer?: NodeJS.Timeout;
  message?: TelegramBot.Message;
  previousMessageText?: string;
  lastHitBy?: IUnit;
  isFightInProgress: boolean = false;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super();
    this.id = Date.now();
    this.chatId = chatId;
    this.bot = bot;
    this.teamGuest = [];
    this.teamHost = [];
    this.battleLog = new BattleLog();

    this.addListener(BattleEvents.UPDATE_MESSAGE, this.handleUpdate);
    this.updateTimer = setInterval(() => this.emit(BattleEvents.UPDATE_MESSAGE), UPDATE_DELAY);
  }

  addToTeamGuest = (unit: IUnit) => {
    this.teamGuest.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
  };

  addToTeamHost = (unit: IUnit) => {
    this.teamHost.push(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handleAttack(unit));
  };

  /**
   * Prepares battleground
   */
  async initBattle() {
    this.sendBattleMessage();
  }

  async endBattle() {
    this.isFightInProgress = false;
    logger.debug("Battle ends, cleaning up...");

    this.battleLog.battleEnd(this.isAnyoneAlive(this.teamGuest) ? SIDE.GUEST : SIDE.HOST);
    this.cleanUp();
    await this.battleLog.postBattleLog(this.getBattleInfo());
    this.handleUpdate(true);
    this.emit(BattleEvents.BATTLE_ENDED);
    this.removeAllListeners();
  }

  public cleanUp() {
    [...this.teamHost, ...this.teamGuest].forEach((unit) => {
      logger.debug("Cleaning up " + unit.getName());
      this.cleanUpUnit(unit);
    });
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  // Starts attacks for all units
  startFight() {
    [...this.teamGuest, ...this.teamHost].forEach((unit) => {
      logger.debug("Starting fight");

      unit.startAttacking();
    });
    this.isFightInProgress = true;
  }

  async sendBattleMessage() {
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
  }

  handleAttack = async (unit: IUnit) => {
    logger.debug("Handling attack by " + unit.getName());

    // Handle attack only if there are units on both sides
    if (this.isAnyoneAlive(this.teamGuest) && this.isAnyoneAlive(this.teamHost)) {
      const isUnitTeamA = this.teamGuest.includes(unit);

      let target: IUnit;
      // Picks random ALIVE target
      do {
        if (isUnitTeamA) {
          target = this.teamHost[getRandomInt(0, this.teamHost.length)];
        } else {
          target = this.teamGuest[getRandomInt(0, this.teamGuest.length)];
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

        this.cleanUpUnit(target);
      }

      // End battle if there are no alive units on any side
      if (!(this.isAnyoneAlive(this.teamGuest) && this.isAnyoneAlive(this.teamHost))) {
        logger.debug(`No one is alive in one of the teams, ending the battle`);

        this.endBattle();
      }
    }
  };

  handleUpdate(hideMarkup: boolean = false) {
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
        disable_web_page_preview: true,
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
  }

  getBattleInfo = (): string => {
    let battleInfoText = `<b>⚜️⚜️⚜️BATTLE⚜️⚜️⚜️</b>\n\n`;

    battleInfoText += `<b>Side</b> 🟠\n`;
    this.teamHost.forEach((unit) => {
      battleInfoText += `➣ ${unit.getShortStats(!unit.isAlive())}\n`;
    });

    battleInfoText += `\n<b>⚔️VERSUS ⚔️</b>\n\n`;

    battleInfoText += `<b>Side</b> 🔵\n`;
    if (this.teamGuest.length === 0) {
      battleInfoText += `<i>Press 'Join fight' to join Side 🔵</i>`;
    }
    this.teamGuest.forEach((unit) => {
      battleInfoText += `➣ ${unit.getShortStats(!unit.isAlive())}\n`;
    });

    return battleInfoText;
  };

  cleanUpUnit = (unit: IUnit) => {
    unit.stopAttacking();
    unit.removeAllListeners();
  };

  isAnyoneAlive = (units: IUnit[]): boolean => {
    return units.some((unit) => unit.isAlive());
  };

  getRandomUnit = (side: SIDE, isAlive: boolean = false): IUnit => {
    let unit: IUnit;

    switch (side) {
      case SIDE.GUEST: {
        do {
          unit = this.teamGuest[getRandomInt(0, this.teamGuest.length)];
        } while (isAlive && this.isAnyoneAlive(this.teamGuest) && !unit.isAlive());
        break;
      }
      case SIDE.HOST: {
        do {
          unit = this.teamHost[getRandomInt(0, this.teamHost.length)];
        } while (isAlive && this.isAnyoneAlive(this.teamHost) && !unit.isAlive());
        break;
      }
    }

    return unit;
  };

  getNumberOfAliveUnits = (side: SIDE): number => {
    let count = 0;
    switch (side) {
      case SIDE.GUEST: {
        this.teamGuest.forEach((unit) => {
          if (unit.isAlive()) {
            count++;
          }
        });
        break;
      }
      case SIDE.HOST: {
        this.teamHost.forEach((unit) => {
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
      case SIDE.GUEST: {
        this.teamGuest.forEach((unit) => (averageLevel += unit.level));
        averageLevel = Math.round(averageLevel / this.teamGuest.length);
        break;
      }
      case SIDE.HOST: {
        this.teamHost.forEach((unit) => (averageLevel += unit.level));
        averageLevel = Math.round(averageLevel / this.teamHost.length);
        break;
      }
    }
    return averageLevel;
  };

  getAverageHP = (side: SIDE) => {
    let averageHP = 0;
    let maxHP = 0;
    switch (side) {
      case SIDE.GUEST: {
        this.teamGuest.forEach((unit) => {
          averageHP += unit.getHP();
          maxHP += unit.getMaxHP();
        });
        return (maxHP / averageHP) * 100;
      }
      case SIDE.HOST: {
        this.teamHost.forEach((unit) => {
          averageHP += unit.getHP();
          maxHP += unit.getMaxHP();
        });
        return (averageHP / maxHP) * 100;
      }
    }
  };
}
