import EventEmitter = require("events");
import { AttackDetails } from "../../misc/AttackDetails";
import { IUpdatable } from "../../IUpdatable";

export interface IUnit extends EventEmitter.EventEmitter, IUpdatable {
  attackTimer?: NodeJS.Timeout;
  level: number;

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
}
