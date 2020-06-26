import { IUnit } from "../units/IUnit";

export interface IBattleGround {
  chatId: number;
  teamA: IUnit[];
  teamB: IUnit[];

  startBattle(): void;
}
