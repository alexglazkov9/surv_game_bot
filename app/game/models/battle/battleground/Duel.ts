import { BattleGround } from "./BattleGround";
import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../../CallbackData";
import { CallbackActions } from "../../../misc/CallbackConstants";
import { logger } from "../../../../utils/logger";
import { BattleEvents } from "../BattleEvents";
import { IndicatorsEmojis } from "../../../misc/IndicatorsEmojis";
import { CharacterPool } from "../../CharacterPool";
import { IUnit } from "../../units/IUnit";
import _ = require("lodash");
import { Character } from "../../units/Character";
import { Engine } from "../../../Engine";

const LEAVE_DELAY = 15 * 1000;

export class Duel extends BattleGround {
  prizeMoney: number = 0;
  hideMarkup: boolean = false;
  leaveBattleTimer?: NodeJS.Timeout;
  teamHostBackup: IUnit[];
  teamGuestBackup: IUnit[];

  constructor({
    chatId,
    bot,
    engine,
    prizeMoney,
  }: {
    chatId: number;
    bot: TelegramBot;
    engine: Engine;
    prizeMoney: number;
  }) {
    super({ chatId, bot, engine });

    this.teamHostBackup = [];
    this.teamGuestBackup = [];

    this.prizeMoney = prizeMoney;
    this.addListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    this.leaveBattleTimer = setInterval(() => this.emit(BattleEvents.LEAVE_BATTLE), LEAVE_DELAY);
  }

  addToTeamGuest = (unit: IUnit) => {
    this.teamGuestBackup.push(unit);
    // Copying unit to prevent actual character from dying in the duel
    const unitCopy: Character = _.cloneDeep(unit as Character);
    unitCopy.setHP(unitCopy.getMaxHP());
    this.teamGuest.push(unitCopy);
    // Add to game loop
    this._engine.Add(unitCopy);
    unitCopy.addListener(BattleEvents.UNIT_ATTACKS, () => this._handleAttack(unitCopy));
    unitCopy.addListener(BattleEvents.UNIT_DIED, () => this._handleDeath(unitCopy));
  };

  addToTeamHost = (unit: IUnit) => {
    this.teamHostBackup.push(unit);
    // Copying unit to prevent actual character from dying in the duel
    const unitCopy: Character = _.cloneDeep(unit as Character);
    unitCopy.setHP(unitCopy.getMaxHP());
    this.teamHost.push(unitCopy);
    // Add to game loop
    this._engine.Add(unitCopy);
    unitCopy.addListener(BattleEvents.UNIT_ATTACKS, () => this._handleAttack(unitCopy));
    unitCopy.addListener(BattleEvents.UNIT_DIED, () => this._handleDeath(unitCopy));
  };

  initBattle = async () => {
    this.sendBattleMessage();
  };

  startFight = () => {
    super.startFight();
    this.cleanLeaveBattleListener();
  };

  endBattle = async (deleteMessage: boolean = false) => {
    // Give away wagers
    if (this.teamGuest.length > 0) {
      if (this._isAnyoneAlive(this.teamGuest)) {
        (this.teamGuestBackup[0] as Character).gainMoney(this.prizeMoney);
        (this.teamGuestBackup[0] as Character).incrementDuelsWon();

        (this.teamHostBackup[0] as Character).gainMoney(-this.prizeMoney);
        (this.teamHostBackup[0] as Character).incrementDuelsLost();

        this.battleLog.wagerWon(this.teamGuest[0], this.prizeMoney);
      } else {
        (this.teamHostBackup[0] as Character).gainMoney(this.prizeMoney);
        (this.teamHostBackup[0] as Character).incrementDuelsWon();

        (this.teamGuestBackup[0] as Character).gainMoney(-this.prizeMoney);
        (this.teamGuestBackup[0] as Character).incrementDuelsLost();

        this.battleLog.wagerWon(this.teamGuest[0], this.prizeMoney);
      }
      (this.teamHostBackup[0] as Character).save();
      (this.teamGuestBackup[0] as Character).save();
    }

    super.endBattle();
  };

  leaveBattle = () => {
    this.hideMarkup = true;
    this.teamHost.forEach((unit) => {
      this.battleLog.leftDuel(unit);
    });
    this.endBattle(true);
  };

  sendBattleMessage = async () => {
    super.sendBattleMessage();

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    // Checks that host is not joining itself
    if (
      this.teamHost.some((unit) => {
        return (unit as Character).getTelegramId() === callbackQuery.from.id;
      })
    ) {
      return;
    }

    // Supports only 1v1 for now
    if (this.teamGuest.length > 0) {
      return;
    }

    const callbackData = CallbackData.fromJson(callbackQuery.data);

    let optsCall: TelegramBot.AnswerCallbackQueryOptions;

    if (callbackData.payload === this.id && callbackData.action === CallbackActions.JOIN_FIGHT) {
      const character = CharacterPool.getInstance().getOne({
        telegramId: callbackQuery.from.id,
        chatId: this.chatId,
      });

      if (character === undefined) {
        return;
      }

      // Prevent double joining, if the character is already in the fight
      if (
        this.teamGuest.findIndex((unit) => {
          return (
            (unit as Character).getTelegramId() === character?.getTelegramId() &&
            (unit as Character).getChatId() === character.getChatId()
          );
        }) !== -1
      ) {
        optsCall = {
          callback_query_id: callbackQuery.id,
          text: "You are in the fight",
          show_alert: false,
        };
        this.bot.answerCallbackQuery(optsCall);
        return;
      }

      // Ensures player has enough money
      if (character._doc.money < this.prizeMoney) {
        optsCall = {
          callback_query_id: callbackQuery.id,
          text: "You don't have enough money",
          show_alert: false,
        };
      } else {
        // Checks that player is alive
        if (character.isAlive()) {
          this.addToTeamGuest(character);

          // Hiding markup after first player joined
          this.hideMarkup = true;

          // Removing `leave battle listener` as character has joined another side
          this.cleanLeaveBattleListener();

          this.startFight();

          this.battleLog.unitJoined(character);
          logger.verbose(`Player ${character?.getName()} joined the fight in ${this.chatId}`);

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
      }

      this.bot.answerCallbackQuery(optsCall);
    }
  };

  _cleanUp = () => {
    super._cleanUp();

    this.bot.removeListener("callback_query", this.onJoinCallbackQuery);

    this.cleanLeaveBattleListener();
  };

  cleanLeaveBattleListener = () => {
    this.removeListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    if (this.leaveBattleTimer) {
      clearInterval(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  _getBattleInfo = (): string => {
    let battleInfoText = `<b>⚜️PVP DUEL⚜️</b>\n<pre>     </pre><b>Wager:</b> ${this.prizeMoney} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b>\n\n`;
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
}
