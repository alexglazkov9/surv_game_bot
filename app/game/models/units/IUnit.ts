import EventEmitter = require("events");
import { AttackDetails } from "../../misc/AttackDetails";
import { IUpdatable } from "../../IUpdatable";
import { IEffect } from "../abilities/IEffect";
import { BattleGround } from "../battle/battleground/BattleGround";

export interface IUnit extends EventEmitter.EventEmitter, IUpdatable {
  level: number;
  _currentBattle?: BattleGround;

  getAttackDamage(attackDetails: AttackDetails): AttackDetails;
  getAttackSpeed(): number;
  getName(): string;
  attack(targets: IUnit[]): AttackDetails;
  takeDamage(attack: AttackDetails): AttackDetails;
  startAttacking(): void;
  stopAttacking(): void;
  isAlive(): boolean;
  getShortStats(isDead?: boolean): string;
  getHpIndicator(): string;
  getMaxHP(): number;
  getHP(): number;
  addEffect(effect: IEffect): void;
  removeEffect(effect: IEffect): void;
}
