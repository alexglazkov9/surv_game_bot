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

const UPDATE_DELAY = 5000;
const LEAVE_DELAY = 5 * 60 * 1000;

export class NPCBattle extends BattleGround {
  leaveBattleTimer?: NodeJS.Timeout;

  constructor({ chatId, bot }: { chatId: number; bot: TelegramBot }) {
    super({ chatId, bot });

    this.addListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    this.leaveBattleTimer = setInterval(() => this.emit(BattleEvents.LEAVE_BATTLE), LEAVE_DELAY);
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

  async endBattle() {
    super.endBattle();
    this.teamGuest.forEach((unit) => {
      // Saves all players' characters
      (unit as IPlayerDocument).statistics.pve.battles++;
      (unit as IPlayerDocument).saveWithRetries();
    });
  }

  startFight = () => {
    super.startFight();
    this.cleanLeaveBattleListener();
  };

  leaveBattle = () => {
    this.teamHost.forEach((unit) => {
      this.battleLog.leftBattle(unit);
    });

    this.endBattle();
  };

  sendBattleMessage = async () => {
    super.sendBattleMessage();

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const callbackData = CallbackData.fromJson(callbackQuery.data);
    if (this.getAverageHP(SIDE.HOST) < 50) {
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
      const player = await PlayerModel.findPlayer({
        telegram_id: callbackQuery.from.id,
        chat_id: this.chatId,
      });

      // Checks if the unit is already in the team
      if (
        this.teamGuest.findIndex((unit) => {
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
        // Checks that unit is alive
        if (player.isAlive()) {
          if (!this.isFightInProgress) {
            this.startFight();
          }

          this.addToTeamGuest(player);
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
  };

  handleAttack = async (attacker: IUnit) => {
    logger.debug("Handling attack by " + attacker.getName());

    // Handle attack only if there are units on both sides
    if (this.isAnyoneAlive(this.teamGuest) && this.isAnyoneAlive(this.teamHost)) {
      const isUnitTeamGuest = this.teamGuest.includes(attacker);

      let target: IUnit;
      // Picks random ALIVE target
      do {
        if (isUnitTeamGuest) {
          target = this.teamHost[getRandomInt(0, this.teamHost.length)];
        } else {
          target = this.teamGuest[getRandomInt(0, this.teamGuest.length)];
        }
      } while (!target.isAlive());

      // Hadnles attack
      const dmgDealt = attacker.attack(target);
      //this.lastHitBy = attacker;

      this.battleLog.attacked(attacker, target, dmgDealt, isUnitTeamGuest ? "🔹" : "🔸");

      // Records target's death
      if (!target.isAlive()) {
        logger.debug(`${target.getName()} died`);

        this.battleLog.killed(attacker, target);

        if (isUnitTeamGuest) {
          await this.rewardPlayers(target as Enemy, attacker);
          //(attacker as IPlayerDocument).saveWithRetries();
        }

        this.cleanUpUnit(target);
      }

      // End battle if there are no alive units on any side
      if (!(this.isAnyoneAlive(this.teamGuest) && this.isAnyoneAlive(this.teamHost))) {
        logger.debug(`No one is alive in one of the teams, ending the battle`);

        this.endBattle();
      }
    }
  };

  cleanLeaveBattleListener = () => {
    this.removeListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    if (this.leaveBattleTimer) {
      clearInterval(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  cleanUp = () => {
    super.cleanUp();

    this.bot.removeListener("callback_query", this.onJoinCallbackQuery);

    this.cleanLeaveBattleListener();
  };

  rewardPlayers = async (unitKilled: Enemy, lastHitBy: IUnit) => {
    this.battleLog.rewardsFrom(unitKilled);

    logger.verbose(`Rewarding for kill`);
    const money = unitKilled.moneyOnDeath;
    const exp = unitKilled.expOnDeath;

    const numberAlive = this.getNumberOfAliveUnits(SIDE.GUEST);
    logger.debug(`Alive ${numberAlive}`);

    if (numberAlive === 1) {
      (lastHitBy as IPlayerDocument).gainXP(exp);
      (lastHitBy as IPlayerDocument).money += money;
      (lastHitBy as IPlayerDocument).statistics.pve.last_hits++;

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
            (unit as IPlayerDocument).gainXP(expLastHit);
            (unit as IPlayerDocument).money += moneyLastHit;
            this.battleLog.lastHitDrop(lastHitBy, unitKilled, expLastHit, moneyLastHit);
          } else {
            (unit as IPlayerDocument).gainXP(expPerUnit);
            (unit as IPlayerDocument).money += moneyPerUnit;
            unitsRewarded.push(unit);
          }
        }
      }
      this.battleLog.expMoneyDropped(unitsRewarded, expPerUnit, moneyPerUnit);
    }

    const itemDrop = await unitKilled.getDropItem();

    if (itemDrop) {
      const rndUnit = this.getRandomUnit(SIDE.GUEST, true);
      await (rndUnit as IPlayerDocument).addItemToInventory(itemDrop);
      this.battleLog.itemDropped(rndUnit, itemDrop.name);
    }

    //this.teamGuest.forEach((character) => (character as IPlayerDocument).saveWithRetries());
  };
}
