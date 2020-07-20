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
import { Engine } from "../../../Engine";

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

  // Engine
  _engine: Engine;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super();
    this.id = Date.now();
    this.chatId = chatId;
    this.bot = bot;
    this.teamGuest = [];
    this.teamHost = [];
    this.battleLog = new BattleLog();

    this.addListener(BattleEvents.UPDATE_MESSAGE, this._handleUpdate);
    this.updateTimer = setInterval(() => this.emit(BattleEvents.UPDATE_MESSAGE), UPDATE_DELAY);

    // Engine
    this._engine = new Engine();
    this._engine.start();
  }

  addToTeamGuest = (unit: IUnit) => {
    this.teamGuest.push(unit);
    // Add to game loop
    this._engine.add(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this._handleAttack(unit));
    unit.addListener(BattleEvents.UNIT_DIED, () => this._handleDeath(unit));
  };

  addToTeamHost = (unit: IUnit) => {
    this.teamHost.push(unit);
    this._engine.add(unit);
    unit.addListener(BattleEvents.UNIT_ATTACKS, () => this._handleAttack(unit));
    unit.addListener(BattleEvents.UNIT_DIED, () => this._handleDeath(unit));
  };

  /**
   * Prepares battleground
   */
  async initBattle() {
    this.sendBattleMessage();
  }

  async endBattle(deleteMessage = false) {
    this.isFightInProgress = false;
    logger.debug("Battle ends, cleaning up...");

    this.battleLog.battleEnd(this._isAnyoneAlive(this.teamGuest) ? SIDE.GUEST : SIDE.HOST);
    this._cleanUp();
    if (!deleteMessage) {
      await this.battleLog.postBattleLog(this._getBattleInfo());
      this._handleUpdate(true);
    } else {
      if (this.message) this.bot.deleteMessage(this.chatId, this.message.message_id.toString());
    }
    this.emit(BattleEvents.BATTLE_ENDED);
    this.removeAllListeners();
  }

  public _cleanUp() {
    [...this.teamHost, ...this.teamGuest].forEach((unit) => {
      logger.debug("Cleaning up " + unit.getName());
      this._cleanUpUnit(unit);
    });
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }

    this._engine.dispose();
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
    const messageText = `${this._getBattleInfo()}\n\n${
      this.battleLog.hasRecords() ? this.battleLog.getBattleLog() : ""
    }`;
    this.previousMessageText = messageText;
    this.message = await this.bot.sendMessage(this.chatId, messageText, this._getSendMessageOpts());
  }

  _handleAttack(unit: IUnit) {
    logger.verbose("Handling attack by " + unit.getName());

    const isUnitTeamGuest = this.teamGuest.includes(unit);
    this.lastHitBy = unit;
    const attackDetails = unit.attack(isUnitTeamGuest ? this.teamHost : this.teamGuest);
    this.battleLog.attacked(unit, attackDetails, isUnitTeamGuest ? "🔹" : "🔸");

    if (attackDetails.target && !attackDetails.target.isAlive()) {
      this.battleLog.killed(attackDetails.target);
    }

    // End battle if there are no alive units on any side
    if (!(this._isAnyoneAlive(this.teamGuest) && this._isAnyoneAlive(this.teamHost))) {
      logger.debug(`No one is alive in one of the teams, ending the battle`);

      this.endBattle();
    }
  }

  _handleDeath(unit: IUnit) {
    this._cleanUpUnit(unit);
  }

  _handleUpdate(hideMarkup: boolean = false) {
    if (this.message !== undefined) {
      const opts = this._getEditMessageOpts();
      if (hideMarkup) {
        delete opts.reply_markup;
      }
      const messageText = `${this._getBattleInfo()}\n\n${
        this.battleLog.hasRecords() ? this.battleLog.getBattleLog() : ""
      }`;
      // Only edit message if the text actually changed
      if (this.previousMessageText !== messageText) {
        this.previousMessageText = messageText;
        this.bot.editMessageText(messageText, opts);
      }
    }
  }

  _getBattleInfo = (): string => {
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

  _getSendMessageOpts = () => {
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

    return opts;
  };

  _getEditMessageOpts = () => {
    const callbackData = new CallbackData({
      action: CallbackActions.JOIN_FIGHT,
      telegram_id: undefined,
      payload: this.id,
    });

    const opts: TelegramBot.EditMessageTextOptions = {
      parse_mode: "HTML",
      chat_id: this.chatId,
      message_id: this.message?.message_id,
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

    return opts;
  };

  _cleanUpUnit = (unit: IUnit) => {
    unit.stopAttacking();
    unit.removeAllListeners();
  };

  _isAnyoneAlive = (units: IUnit[]): boolean => {
    return units.some((unit) => unit.isAlive());
  };

  _getRandomUnit = (side: SIDE, isAlive: boolean = false): IUnit => {
    let unit: IUnit;

    switch (side) {
      case SIDE.GUEST: {
        do {
          unit = this.teamGuest[getRandomInt(0, this.teamGuest.length)];
        } while (isAlive && this._isAnyoneAlive(this.teamGuest) && !unit.isAlive());
        break;
      }
      case SIDE.HOST: {
        do {
          unit = this.teamHost[getRandomInt(0, this.teamHost.length)];
        } while (isAlive && this._isAnyoneAlive(this.teamHost) && !unit.isAlive());
        break;
      }
    }

    return unit;
  };

  _getNumberOfAliveUnits = (side: SIDE): number => {
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

  _getAverageLevel = (side: SIDE) => {
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

  _getAverageHP = (side: SIDE) => {
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
