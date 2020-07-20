import { IUnit } from "../../units/IUnit";
import TelegramBot from "node-telegram-bot-api";
import { BattleEvents } from "../BattleEvents";
import { getRandomInt, sleep } from "../../../../utils/utils";
import { logger } from "../../../../utils/logger";
import { IPlayerDocument, IPlayer } from "../../../../database/players/players.types";
import { Enemy } from "../../units/Enemy";
import { BattleGround, SIDE } from "./BattleGround";
import { CallbackData } from "../../CallbackData";
import { CallbackActions } from "../../../misc/CallbackConstants";
import { PlayerModel } from "../../../../database/players/players.model";
import { gameManager } from "../../../../app";
import { CharacterPool } from "../../CharacterPool";
import { Character } from "../../units/Character";

const UPDATE_DELAY = 5000;
const LEAVE_DELAY = 5 * 60 * 1000;

export class NPCBattle extends BattleGround {
  leaveBattleTimer?: NodeJS.Timeout;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super({ chatId, bot });

    this.addListener(BattleEvents.LEAVE_BATTLE, this._leaveBattle);
    this.leaveBattleTimer = setTimeout(() => this.emit(BattleEvents.LEAVE_BATTLE), LEAVE_DELAY);
  }

  initBattle = async () => {
    // Clean leave battle listener if there is a unit in the opposite team
    if (this.teamGuest.length > 0) {
      this.cleanLeaveBattleListener();
      this.teamGuest.forEach((unit) => {
        this.battleLog.foundUnit(unit);
      });
    }

    super.initBattle();
  };

  async endBattle(deleteMessage: boolean = false) {
    super.endBattle(deleteMessage);
    this.teamGuest.forEach((unit) => {
      // Saves all players' characters
      (unit as Character).incrementBattleStatistics();
      (unit as Character).save();
    });
  }

  startFight = () => {
    super.startFight();
    this.cleanLeaveBattleListener();
  };

  _leaveBattle() {
    this.teamHost.forEach((unit) => {
      this.battleLog.leftBattle(unit);
    });

    this.endBattle(true);
  }

  sendBattleMessage = async () => {
    super.sendBattleMessage();

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  _handleDeath(unit: IUnit) {
    super._handleDeath(unit);

    // Give rewards if it was NPC who died
    const isUnitTeamHost = this.teamHost.includes(unit);
    if (isUnitTeamHost && this.lastHitBy) {
      this.rewardPlayers(unit as Enemy, this.lastHitBy);
    }
  }

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const callbackData = CallbackData.fromJson(callbackQuery.data);
    if (this._getAverageHP(SIDE.HOST) < 50) {
      const optsCall: TelegramBot.AnswerCallbackQueryOptions = {
        callback_query_id: callbackQuery.id,
        text: "You can't join when HP is less then 50%",
        show_alert: false,
      };

      this.bot.answerCallbackQuery(optsCall);
      return;
    }

    if (callbackData.payload === this.id && callbackData.action === CallbackActions.JOIN_FIGHT) {
      // Fetches character
      const characterDoc: IPlayerDocument | undefined = CharacterPool.getInstance().getOne({
        chatId: this.chatId,
        telegramId: callbackQuery.from.id,
      });

      if (characterDoc === undefined) {
        return;
      }

      const character = new Character(characterDoc);

      // Checks if the unit is already in the team
      if (
        this.teamGuest.findIndex((unit) => {
          return (
            (unit as Character).getTelegramId() === character.getTelegramId() &&
            (unit as Character).getChatId() === character.getChatId()
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
        // Checks that unit is alive
        if (characterDoc.isAlive()) {
          if (!this.isFightInProgress) {
            this.startFight();
          }

          this.addToTeamGuest(character);
          character.startAttacking();

          this.battleLog.unitJoined(character);

          logger.verbose(`Player ${characterDoc?.name} joined the fight in ${this.chatId}`);

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
  };

  cleanLeaveBattleListener = () => {
    this.removeListener(BattleEvents.LEAVE_BATTLE, this._leaveBattle);
    if (this.leaveBattleTimer) {
      clearTimeout(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  _cleanUp = () => {
    super._cleanUp();

    this.bot.removeListener("callback_query", this.onJoinCallbackQuery);

    this.cleanLeaveBattleListener();
  };

  rewardPlayers = async (unitKilled: Enemy, lastHitBy: IUnit) => {
    this.battleLog.rewardsFrom(unitKilled);

    logger.verbose(`Rewarding for kill`);
    const money = unitKilled.moneyOnDeath;
    const exp = unitKilled.expOnDeath;

    const numberAlive = this._getNumberOfAliveUnits(SIDE.GUEST);
    logger.debug(`Alive ${numberAlive}`);

    if (numberAlive === 1) {
      (lastHitBy as Character).gainXP(exp);
      (lastHitBy as Character).gainMoney(money);
      (lastHitBy as Character).incrementLastHitStatistics();

      this.battleLog.lastHitDrop(lastHitBy, unitKilled, exp, money);
    } else {
      const moneyLastHit = (money / numberAlive) * 1.1;
      const expLastHit = (exp / numberAlive) * 1.1;
      const moneyPerUnit = (money - moneyLastHit) / (numberAlive - 1);
      const expPerUnit = (exp - expLastHit) / (numberAlive - 1);

      const unitsRewarded = [];
      for (const unit of this.teamGuest) {
        if (unit.isAlive()) {
          if (unit === lastHitBy) {
            (unit as Character).gainXP(expLastHit);
            (unit as Character).gainMoney(moneyLastHit);
            this.battleLog.lastHitDrop(lastHitBy, unitKilled, expLastHit, moneyLastHit);
          } else {
            (unit as Character).gainXP(expPerUnit);
            (unit as Character).gainMoney(moneyPerUnit);
            unitsRewarded.push(unit);
          }
        }
      }
      this.battleLog.expMoneyDropped(unitsRewarded, expPerUnit, moneyPerUnit);
    }

    const itemDrop = await unitKilled.getDropItem();

    if (itemDrop) {
      const rndUnit = this._getRandomUnit(SIDE.GUEST, true);
      (rndUnit as Character).addItemToInventory(itemDrop);
      this.battleLog.itemDropped(rndUnit, itemDrop.name);
    }
  };
}
