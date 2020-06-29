import EventEmitter = require("events");

export interface IUnit extends EventEmitter.EventEmitter {
  attackTimer?: NodeJS.Timeout;

  getAttackDamage(): number;
  getAttackSpeed(): number;
  getName(): string;
  attack(target: IUnit): number;
  takeDamage(dmg: number): number;
  startAttacking(): void;
  stopAttacking(): void;
  isAlive(): boolean;
  getShortStats(isDead?: boolean): string;
  getHpIndicator(): string;
}