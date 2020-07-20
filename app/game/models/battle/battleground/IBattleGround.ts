import { IUnit } from "../../units/IUnit";
import TelegramBot from "node-telegram-bot-api";

export interface IBattleGround {
  chatId: number;
  teamGuest: IUnit[];
  teamHost: IUnit[];

  initBattle(): void;

  // Sends the message where fight will take place
  sendBattleMessage(): void;

  // Starts the fight and attacks for all units
  startFight(): void;

  // Team management
  addToTeamHost(unit: IUnit): void;
  addToTeamGuest(unit: IUnit): void;

  // Ends battle, cleans up
  endBattle(deleteMessage: boolean): void;

  // Handles all units' attacks
  _handleAttack(unit: IUnit): void;

  // Edits the battle message with latest changes
  _handleUpdate(hideMarkup: boolean): void;

  // Retuns battle ground header
  _getBattleInfo(): string;
}
