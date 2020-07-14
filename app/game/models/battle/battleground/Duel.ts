import { IBattleGround } from "./IBattleGround";
import { BattleGround } from "./BattleGround";
import TelegramBot from "node-telegram-bot-api";
import { IPlayerDocument, IPlayer } from "../../../../database/players/players.types";
import { CallbackData } from "../../CallbackData";
import { CallbackActions } from "../../../misc/CallbackConstants";
import { PlayerModel } from "../../../../database/players/players.model";
import { logger } from "../../../../utils/logger";
import { BattleEvents } from "../BattleEvents";
import { IndicatorsEmojis } from "../../../misc/IndicatorsEmojis";
import { CharacterPool } from "../../CharacterPool";

const LEAVE_DELAY = 15 * 1000;

export class Duel extends BattleGround {
  prizeMoney: number = 0;
  hideMarkup: boolean = false;
  leaveBattleTimer?: NodeJS.Timeout;

  constructor({
    chatId,
    bot,
    prizeMoney,
  }: {
    chatId: number;
    bot: TelegramBot;
    prizeMoney: number;
  }) {
    super({ chatId, bot });

    this.prizeMoney = prizeMoney;
    this.addListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    this.leaveBattleTimer = setInterval(() => this.emit(BattleEvents.LEAVE_BATTLE), LEAVE_DELAY);
  }

  initBattle = async () => {
    // Give full hp to all
    [...this.teamHost, ...this.teamGuest].forEach((unit) => {
      (unit as IPlayerDocument).health_points = (unit as IPlayerDocument).getMaxHP();
    });
    this.sendBattleMessage();
  };

  startFight = () => {
    super.startFight();
  };

  endBattle = async () => {
    // Give away wagers
    if (this.teamGuest.length > 0) {
      if (this.isAnyoneAlive(this.teamGuest)) {
        await (this.teamGuest[0] as IPlayerDocument).update({
          money: (this.teamGuest[0] as IPlayerDocument).money + this.prizeMoney,
          statisctics: {
            duels: { won: (this.teamGuest[0] as IPlayerDocument).statistics.duels.won + 1 },
          },
        });
        await (this.teamHost[0] as IPlayerDocument).update({
          money: (this.teamHost[0] as IPlayerDocument).money - this.prizeMoney,
          statisctics: {
            duels: { lost: (this.teamHost[0] as IPlayerDocument).statistics.duels.lost + 1 },
          },
        });
        this.battleLog.wagerWon(this.teamGuest[0], this.prizeMoney);
      } else {
        await (this.teamGuest[0] as IPlayerDocument).update({
          money: (this.teamGuest[0] as IPlayerDocument).money - this.prizeMoney,
          statisctics: {
            duels: { lost: (this.teamGuest[0] as IPlayerDocument).statistics.duels.lost + 1 },
          },
        });
        await (this.teamHost[0] as IPlayerDocument).update({
          money: (this.teamHost[0] as IPlayerDocument).money + this.prizeMoney,
          statisctics: {
            duels: { won: (this.teamGuest[0] as IPlayerDocument).statistics.duels.won + 1 },
          },
        });
        this.battleLog.wagerWon(this.teamHost[0], this.prizeMoney);
      }
    }

    super.endBattle();
  };

  leaveBattle = () => {
    this.hideMarkup = true;
    this.teamHost.forEach((unit) => {
      this.battleLog.leftDuel(unit);
    });
    this.endBattle();
  };

  sendBattleMessage = async () => {
    super.sendBattleMessage();

    this.bot.on("callback_query", this.onJoinCallbackQuery);
  };

  onJoinCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    // Checks that host is not joining itself
    if (
      this.teamHost.some((unit) => {
        return (unit as IPlayerDocument).telegram_id === callbackQuery.from.id;
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
      const player = CharacterPool.getInstance().getOne({
        telegramId: callbackQuery.from.id,
        chatId: this.chatId,
      });

      if (player === undefined) {
        return;
      }

      // Prevent double joining, if the character is already in the fight
      if (
        this.teamGuest.findIndex((unit) => {
          return (
            (unit as IPlayerDocument).telegram_id === player?.telegram_id &&
            (unit as IPlayerDocument).chat_id === player.chat_id
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
      if (player.money < this.prizeMoney) {
        optsCall = {
          callback_query_id: callbackQuery.id,
          text: "You don't have enough money",
          show_alert: false,
        };
      } else {
        // Checks that player is alive
        if (player.isAlive()) {
          (player as IPlayerDocument).health_points = (player as IPlayerDocument).getMaxHP();
          this.addToTeamGuest(player);

          // Hiding markup after first player joined
          this.hideMarkup = true;

          // Removing `leave battle listener` as character has joined another side
          this.cleanLeaveBattleListener();

          this.startFight();

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
      }

      this.bot.answerCallbackQuery(optsCall);
    }
  };

  cleanUp = () => {
    super.cleanUp();

    this.bot.removeListener("callback_query", this.onJoinCallbackQuery);

    this.cleanLeaveBattleListener();
  };

  handleUpdate(hideMarkup: boolean = false) {
    super.handleUpdate(this.hideMarkup);
  }

  cleanLeaveBattleListener = () => {
    this.removeListener(BattleEvents.LEAVE_BATTLE, this.leaveBattle);
    if (this.leaveBattleTimer) {
      clearInterval(this.leaveBattleTimer);
      this.leaveBattleTimer = undefined;
    }
  };

  getBattleInfo = (): string => {
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
