import { Unit } from "../Unit";

export interface IBattleGround {
  chatId: number;
  teamA: Unit[];
  teamB: Unit[];

  startBattle(): void;
}
