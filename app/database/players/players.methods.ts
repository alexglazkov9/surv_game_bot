import { IPlayerDocument } from "./players.types";
import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { IWeaponDocument, IWeapon, IArmor, IItemDocument, IItem } from "../items/items.types";
import { Types } from "mongoose";
import { logger } from "../../utils/logger";
import { Enemy } from "../../game/models/units/Enemy";
import { CallbackData } from "../../game/models/CallbackData";
import { IUnit } from "../../game/models/units/IUnit";
import { BattleEvents } from "../../game/models/battle/BattleEvents";
import { ItemModel } from "../items/items.model";
import { PlayerModel } from "./players.model";
import { GameParams } from "../../game/misc/GameParameters";
import { ItemType } from "../../game/misc/ItemType";

const DEFAULT_ATTACK_SPEED = 5000;

export function getPlayerStats(this: IPlayerDocument): string {
  const equipedWeapon = this.getEquipedWeapon();
  const equipedArmor = this.getEquipedArmor();
  const statsString = `<b>${this.name}</b> - ${this.level} lvl ${
    this.health_points <= 0 ? "💀DEAD💀" : ""
  }\n
     💚HP: ${this.health_points.toFixed(1)}\\${this.getMaxHP().toFixed(1)}
     🛡Armor: ${equipedArmor ? `<b>${equipedArmor.armor}</b>(${equipedArmor.durability})` : "0(0)"}
     🗡Damage: ${
       equipedWeapon ? `<b>${equipedWeapon.damage}</b>(${equipedWeapon.durability})` : "1(∞)"
     }
     ❇Exp: ${this.experience.toFixed(1)}\\${this.getExpCap().toFixed(0)}
     💰Cash: ${this.money.toFixed(2)}
    `;
  return statsString;
}

export function getStamina(this: IPlayerDocument): number {
  let stamina = 0;
  // Add base stamina
  stamina += this.stamina;

  // Add weapon's stamina
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    stamina += weapon?.stamina;
  }

  // Add armor's stamina
  const armors = this.getAllEquipment();
  armors.forEach((armor) => {
    logger.debug("item " + armor.stamina);
    stamina += armor.stamina;
  });

  return stamina;
}

export function getStrength(this: IPlayerDocument): number {
  let strength = 0;
  // Add base strength
  strength += this.strength;

  // Add weapon's strength
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    strength += weapon?.strength;
  }

  // Add armor's strength
  const armors = this.getAllEquipment();
  armors.forEach((armor) => {
    strength += armor.strength;
  });

  return strength;
}

export function getAgility(this: IPlayerDocument): number {
  let agility = 0;
  // Add base agility
  agility += this.agility;

  // Add weapon's agility
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    agility += weapon?.agility;
  }

  // Add armor's agility
  const equipment = this.getAllEquipment();
  equipment.forEach((armor) => {
    agility += armor.agility;
  });

  return agility;
}

export function getMaxHP(this: IPlayerDocument): number {
  return this.getStamina() * GameParams.STAMINA_MULTIPLIER;
}

export function getArmor(this: IPlayerDocument): number {
  let armor = 0;
  const equipment = this.getAllEquipment();
  equipment.forEach((item) => {
    armor += item.armor;
  });
  return armor;
}

export function getArmorReduction(this: IPlayerDocument): number {
  const armor = this.getArmor();
  return armor / (GameParams.STRENGTH_TO_DAMAGE_WEIGHT + armor);
}

export function getDamage(this: IPlayerDocument): number {
  let damage = 0;

  // Get base damage
  const weaponEquipped = this.getEquipedWeapon();
  if (weaponEquipped) {
    damage += weaponEquipped.damage;
  } else {
    damage = GameParams.PLAYER_BASE_DAMAGE;
  }

  // Apply strength
  const strength = this.getStrength();
  damage = damage * (1 + strength / (GameParams.STRENGTH_TO_DAMAGE_WEIGHT + strength));

  return damage;
}

export function getCritChance(this: IPlayerDocument): number {
  let critChance = 0;

  let crit = this.getAgility();

  // Add weapon's crit points
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    crit += weapon?.crit_chance;
  }

  // Add armor's crit points
  const equipment = this.getAllEquipment();
  equipment.forEach((armor) => {
    crit += armor.crit_chance;
  });

  critChance = crit / (GameParams.AGILITY_TO_CRIT_WEIGHT + crit);

  return critChance;
}

export function getDodgeChance(this: IPlayerDocument): number {
  let dodgeChance = 0;

  let dodge = this.getAgility();

  // Add weapon's attack speed
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    dodge += weapon?.dodge_chance;
  }

  // Add armor's attack speed
  const equipment = this.getAllEquipment();
  equipment.forEach((armor) => {
    dodge += armor.dodge_chance;
  });

  dodgeChance = dodge / (GameParams.AGILITY_TO_DODGE_WEIGHT + dodge);

  return dodgeChance;
}

export function getAttackSpeed(this: IPlayerDocument): number {
  let attackSpeed = 0;

  // Get base attack speed from agility
  const agility = this.getAgility();
  attackSpeed += agility * GameParams.AGILITY_TO_ATTACK_SPEED_MULTIPLIER;

  // Add weapon's attack speed
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    attackSpeed += weapon?.attack_speed;
  }

  // Add armor's attack speed
  const equipment = this.getAllEquipment();
  equipment.forEach((armor) => {
    attackSpeed += armor.attack_speed;
  });

  return attackSpeed;
}

export function getAttackSpeedDelay(this: IPlayerDocument): number {
  const attackSpeed = this.getAttackSpeed();

  const reduction = attackSpeed / (GameParams.ATTACK_SPEED_DELAY_WEIGHT + attackSpeed);

  let delay;
  const weapon = this.getEquipedWeapon();
  if (weapon) {
    delay = weapon?.base_attack_speed * (1 - reduction);
  } else {
    delay = GameParams.PLAYER_BASE_ATTACK_SPEED * (1 - reduction);
  }

  return delay;
}

export function getMinStats(this: IPlayerDocument): string {
  const statsString = `(💚${this.health_points.toFixed(1)})`;
  return statsString;
}

export async function recalculateAndSave(this: IPlayerDocument): Promise<void> {
  if (this.health_points <= 0) {
    this.die();
  }

  if (this.experience >= this.getExpCap()) {
    this.levelUp();
  }

  logger.debug(`Saving player in recalculateAndSave()`);
  await this.saveWithRetries();
}

export async function saveWithRetries(this: IPlayerDocument): Promise<void> {
  try {
    logger.debug(`Saving with retries`);
    await this.save();
  } catch (e) {
    logger.debug(`Failed to save, trying again... ${e}`);
    setTimeout(async () => await this.saveWithRetries(), 1000);
  }
}

export async function die(this: IPlayerDocument, save: boolean = false): Promise<void> {
  this.health_points = 0;
  // this.action_points /= 2;
  this.experience = 0;
  if (save) {
    await this.saveWithRetries();
  }
  bot.sendMessage(this.chat_id, `${this.name} died like a lil bitch`);
}

export async function levelUp(this: IPlayerDocument, save: boolean = false): Promise<void> {
  while (this.experience >= this.getExpCap()) {
    this.experience -= this.getExpCap();
    this.level++;
    // this.health_points_max += 2;
    // this.ap_gain_rate += 0.1;
  }
  if (save) {
    logger.debug(`Saving player in levelUp()`);
    await this.saveWithRetries();
  }
}

export function takeDamage(this: IPlayerDocument, dmg: number): number {
  // Chance to dodge
  if (Math.random() <= this.getDodgeChance()) {
    return 0;
  }

  // Armor reduction
  const totalDamage = dmg * (1 - this.getArmorReduction());

  this.health_points -= totalDamage;

  this.recalculateAndSave();

  return totalDamage;
}

export function getExpCap(this: IPlayerDocument): number {
  return this.level * 2 + 10 - 2;
}

export function getHitDamage(this: IPlayerDocument): number {
  let dmg = 1;
  const weapon = this.getEquipedWeapon();
  if (weapon != null) {
    dmg = (weapon as IWeaponDocument).damage;
  }
  return dmg;
}

export async function hitEnemy(this: IPlayerDocument, enemy: Enemy): Promise<void> {
  // enemy.takeIncomingDamage(this);
  // if (this.equiped_weapon != null) {
  //   this.inventory.forEach((item, index) => {
  //     if (item._id.toString() === this.equiped_weapon?._id.toString()) {
  //       (item as IWeapon).durability--;
  //       // this.action_points -= (item as IWeapon).ap_cost;
  //       if ((item as IWeapon).durability <= 0) {
  //         this.inventory.splice(index, 1);
  //         this.equiped_weapon = null;
  //       }
  //     }
  //   });
  // } else {
  //   // this.action_points--;
  // }
  // await this.recalculateAndSave();
}

export async function addItemToInventory(this: IPlayerDocument, item: IItemDocument) {
  if (item) {
    item._id = Types.ObjectId();
    item.isNew = true;
    this.inventory.push(item);
  }
}

export function canAttack(this: IPlayerDocument, callbackQueryId: string | null = null): boolean {
  const equipedWeapon = this.getEquipedWeapon();
  if (callbackQueryId) {
    if (!this.isAlive()) {
      const optsCall: TelegramBot.AnswerCallbackQueryOptions = {
        callback_query_id: callbackQueryId,
        text: "You are DEAD",
        show_alert: false,
      };
      bot.answerCallbackQuery(optsCall);
    }
  }

  return this.health_points > 0;
}

export function isAlive(this: IPlayerDocument): boolean {
  return this.health_points > 0;
}

export async function revive(this: IPlayerDocument): Promise<void> {
  this.health_points = this.getMaxHP() / 2;
  logger.debug(`Saving player in revive()`);
  await this.saveWithRetries();
}

export async function passiveRegen(this: IPlayerDocument, percentage: number): Promise<void> {
  const maxHP = this.getMaxHP();
  this.health_points += maxHP * (percentage / 100);
  if (this.health_points > maxHP) {
    this.health_points = maxHP;
  }
  logger.debug(`Saving player in passiveRegen()`);
  await this.saveWithRetries();
}

export async function gainAP(this: IPlayerDocument, baseAmount: number = 1): Promise<void> {
  // this.action_points += this.ap_gain_rate;
  logger.debug(`Saving player in gainAp()`);
  await this.saveWithRetries();
}

export function gainXP(this: IPlayerDocument, amount: number): void {
  this.experience += amount;
  this.levelUp(false);
}

export function gainHP(
  this: IPlayerDocument,
  amount: number,
  opts: { isPercentage: boolean }
): void {
  const maxHP = this.getMaxHP();
  if (opts?.isPercentage) {
    this.health_points += maxHP * (amount / 100);
  } else {
    this.health_points += amount;
  }

  if (this.health_points > maxHP) {
    this.health_points = maxHP;
  }

  this.saveWithRetries();
}

export function getEquipedWeapon(this: IPlayerDocument): IWeapon | null {
  if (this.equipment.weapon) {
    const weapon = this.inventory.find((item) => {
      return item._id.toString() === this.equipment.weapon?._id.toString();
    });

    return weapon as IWeapon;
  }
  return null;
}

export function getEquipedArmor(this: IPlayerDocument): IArmor | null {
  // if (this.equiped_armor) {
  //   const armor = this.inventory.find((item) => {
  //     return item._id.toString() === this.equiped_armor?.toString();
  //   });
  //   return armor as IArmor;
  // }
  return null;
}

export function getAllEquipment(this: IPlayerDocument): IItem[] {
  const ids = Object.values(this.equipment.armor);
  return this.inventory.filter((item) => ids.some((id) => item._id.toString() === id?.toString()));
}

export function isItemEquiped(this: IPlayerDocument, id: number): boolean {
  return this.getAllEquipment().some((item) => item?._id?.toString() === id.toString());
}

// IUnit methods
export function getAttackDamage(this: IPlayerDocument): number {
  let damage = this.getDamage();

  // Apply crit damage
  if (Math.random() < this.getCritChance()) {
    damage *= GameParams.DEFAULT_CRIT_MULTIPLIER;
  }

  return damage;
}

export function getBaseAttackSpeed(this: IPlayerDocument): number {
  const equipedWeapon = this.getEquipedWeapon();
  if (equipedWeapon) {
    return equipedWeapon.attack_speed;
  } else {
    return GameParams.PLAYER_BASE_ATTACK_SPEED;
  }
}

export function getName(this: IPlayerDocument): string {
  return this.name;
}

export function attack(this: IPlayerDocument, target: IUnit): number {
  const dmgDealt = target.takeDamage(this.getAttackDamage());

  return dmgDealt;
}

export function startAttacking(this: IPlayerDocument) {
  if (this.attackTimer !== undefined) {
    this.stopAttacking();
  }
  this.attackTimer = setInterval(
    () => this.emit(BattleEvents.UNIT_ATTACKS),
    this.getAttackSpeedDelay()
  );
}

export function stopAttacking(this: IPlayerDocument) {
  if (this.attackTimer !== undefined) {
    clearInterval(this.attackTimer);
    this.attackTimer = undefined;
  }
}

export function getShortStats(this: IPlayerDocument, isDead: boolean = false): string {
  let name = `${this.getName()}`;
  if (isDead) {
    name = `☠️<del>${name}</del>`;
  }
  const statsText = `<b>${name}</b> \- ${this.level} level
    💚${this.health_points.toFixed(1)}\\${this.getMaxHP().toFixed(
    1
  )} 🗡${this.getAttackDamage().toFixed(2)} 🛡${this.getArmor().toFixed(0)}`;
  return statsText;
}

export function getHpIndicator(this: IPlayerDocument): string {
  const hpIndicator = `💚${this.health_points.toFixed(1)}`;
  return hpIndicator;
}

export async function getLatest(this: IPlayerDocument) {
  return await PlayerModel.findOne({ _id: this._id });
}
