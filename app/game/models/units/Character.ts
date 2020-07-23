import { IPlayerDocument } from "../../../database/players/players.types";
import { IUpdatable } from "../../IUpdatable";
import EventEmitter = require("events");
import { BattleEvents } from "../battle/BattleEvents";
import { IUnit } from "./IUnit";
import { AttackDetails, AttackModifier } from "../../misc/AttackDetails";
import { getRandomInt } from "../../../utils/utils";
import { IItemDocument } from "../../../database/items/items.types";
import { logger } from "../../../utils/logger";
import { IEffect } from "../abilities/IEffect";
import { BattleGround } from "../battle/battleground/BattleGround";

export class Character extends EventEmitter.EventEmitter implements IUpdatable, IUnit {
  _doc: IPlayerDocument;

  // IUnit
  level: number;
  isInFight: boolean = false;
  _currentBattle?: BattleGround;
  _effects: IEffect[] = [];

  // Attack handling
  _isAttacking: boolean = false;
  _nextAttackTime: number = 0;

  constructor(charcterDoc: IPlayerDocument) {
    super();
    this._doc = charcterDoc;
    this.level = this._doc.level;
  }

  _update(delta: number) {
    this._nextAttackTime -= delta;
    this._tryAttack();
  }

  addEffect(effect: IEffect): void {
    this._effects.push(effect);
  }

  removeEffect(effect: IEffect): void {}

  attack(targets: IUnit[]): AttackDetails {
    let target: IUnit;
    do {
      target = targets[getRandomInt(0, targets.length)];
    } while (!target.isAlive());

    let attackDetails = new AttackDetails();
    attackDetails.target = target;
    attackDetails = target.takeDamage(this.getAttackDamage(attackDetails));

    return attackDetails;
  }

  getAttackDamage(attackDetails: AttackDetails) {
    attackDetails.modifier = AttackModifier.NORMAL;
    attackDetails.damageDealt = this._doc.getDamage();

    // Apply crit damage
    if (Math.random() < this._doc.getCritChance()) {
      attackDetails.damageDealt *= this._doc.getCritMultiplier();
      attackDetails.modifier = AttackModifier.CRITICAL_STRIKE;
    }

    return attackDetails;
  }

  getAttackSpeed(): number {
    return this._doc.getAttackSpeed();
  }

  getName(): string {
    return this._doc.getName();
  }

  takeDamage(attack: AttackDetails): AttackDetails {
    // Chance to dodge
    if (Math.random() <= this._doc.getDodgeChance()) {
      attack.damageDealt = 0;
      attack.modifier = AttackModifier.DODGE;
      return attack;
    }

    // Armor reduction
    const totalDamage = attack.damageDealt * (1 - this._doc.getArmorReduction());
    this._doc.health_points -= totalDamage;
    if (!this.isAlive()) {
      this._die();
    }
    attack.damageDealt = totalDamage;
    return attack;
  }

  startAttacking(): void {
    logger.verbose(`${this.getName()} starting attacking`);
    this._nextAttackTime = this._doc.getAttackSpeedDelay();
    this._isAttacking = true;
  }

  stopAttacking(): void {
    this._isAttacking = false;
  }

  isAlive(): boolean {
    return this._doc.health_points > 0;
  }

  getShortStats(isDead?: boolean): string {
    return this._doc.getShortStats();
  }

  getHpIndicator(): string {
    return this._doc.getHpIndicator();
  }

  getMaxHP(): number {
    return this._doc.getMaxHP();
  }

  getHP(): number {
    return this._doc.getHP();
  }

  setHP(hp: number) {
    this._doc.health_points = hp;
  }

  save() {
    this._doc.saveWithRetries();
  }

  incrementBattleStatistics() {
    this._doc.statistics.pve.battles = this._doc.statistics.pve.battles + 1 || 1;
  }

  incrementLastHitStatistics() {
    this._doc.statistics.pve.last_hits = this._doc.statistics.pve.last_hits + 1 || 1;
  }

  incrementDuelsLost() {
    this._doc.statistics.duels.lost = this._doc.statistics.duels.lost + 1 || 1;
  }

  incrementDuelsWon() {
    this._doc.statistics.duels.won = this._doc.statistics.duels.won + 1 || 1;
  }

  gainXP(amount: number) {
    this._doc.gainXP(amount);
  }

  gainMoney(amount: number) {
    this._doc.money += amount;
  }

  addItemToInventory(item: IItemDocument) {
    this._doc.addItemToInventory(item);
  }

  getTelegramId() {
    return this._doc.telegram_id;
  }

  getChatId() {
    return this._doc.chat_id;
  }

  _tryAttack() {
    if (this._isAttacking) {
      if (this._nextAttackTime <= 0) {
        logger.debug(`${this.getName()} Attacking`);
        this.emit(BattleEvents.UNIT_ATTACKS);
        this._nextAttackTime = this._doc.getAttackSpeedDelay();
      }
    }
  }

  _die() {
    logger.verbose(`${this.getName()} dies`);
    this._doc.health_points = 0;
    this._isAttacking = false;
    this.emit(BattleEvents.UNIT_DIED);
  }
}
