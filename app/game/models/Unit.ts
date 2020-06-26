import EventEmitter = require("events");

export interface Unit extends EventEmitter.EventEmitter{
  attackSpeed: number;

  getAttackDamage(): number;
  attack(target: Unit): void;
  takeIncomingDamage(dmg: number): void;
  startAttacking():void;
}
