import EventEmitter = require("events");
import { AttackDetails } from "../../misc/AttackDetails";

export interface IUnit extends EventEmitter.EventEmitter {
  attackTimer?: NodeJS.Timeout;
  level: number;
  isInFight: boolean;

  getAttackDamage(): AttackDetails;
  getAttackSpeed(): number;
  getName(): string;
  attack(target: IUnit): AttackDetails;
  takeDamage(attack: AttackDetails): AttackDetails;
  startAttacking(): void;
  stopAttacking(): void;
  isAlive(): boolean;
  getShortStats(isDead?: boolean): string;
  getHpIndicator(): string;
  getMaxHP(): number;
  getHP(): number;
}
