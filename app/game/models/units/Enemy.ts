import EventEmitter = require("events");
import { IPlayerDocument } from "../../../database/players/players.types";
import { getRandomInt } from "../../../utils/utils";
import { CallbackData } from "../CallbackData";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackActions } from "../../misc/CallbackConstants";
import { logger } from "../../../utils/logger";
import { PlayerModel } from "../../../database/players/players.model";
import { IUnit } from "./IUnit";
import { BattleEvents } from "../battle/BattleEvents";
import { INPCUnit } from "./INPCUnit";
import { GameParams } from "../../misc/GameParameters";
import { ItemModel } from "../../../database/items/items.model";
import {
  IItem,
  IItemDocument,
  IWeapon,
  IWeaponDocument,
  IArmorDocument,
} from "../../../database/items/items.types";
import { ItemType } from "../../misc/ItemType";
import { AttackDetails, AttackModifier } from "../../misc/AttackDetails";
import { IUpdatable } from "../../IUpdatable";
import { IEffect } from "../abilities/IEffect";
import { BattleGround } from "../battle/battleground/BattleGround";

const UPDATE_DELAY = 5000;
const ATTACK_CHAT_EVENT = "attack_chat_event";
const ATTACK_FIGHT_EVENT = "attack_fight_event";
const ATTACK_BY_PLAYER = "attack_by_player";
const UPDATE_EVENT = "update_event";
export const ON_DEATH_EVENT = "ON_DEATH_EVENT";

export class Enemy extends EventEmitter.EventEmitter implements IUpdatable, IUnit {
  id: number;
  bot: TelegramBot;
  chatId: number;
  name: string;
  tier: number;
  level: number;

  // STATS
  baseHp: number;
  hp: number;
  damage: number;
  baseAttackSpeed: number;
  armor: number;
  stamina: number;
  agility: number;
  strength: number;
  dodgeChance: number;
  critChance: number;
  attackSpeed: number;

  // Attack handling
  _isAttacking: boolean = false;
  _nextAttackTime: number = 0;

  // DROP
  expOnDeath: number;
  moneyOnDeath: number;
  itemDropChance: any[];

  // FUNCTIONAL
  attackRateInFight: number;

  // IUnit
  _currentBattle?: BattleGround;
  _effects: IEffect[] = [];

  constructor({
    bot,
    name,
    chat_id,
    hp = 10,
    level = 1,
    exp_on_death = 1,
    money_on_death = 0,
    damage = 1,
    armor = 0,
    tier = 1,
    base_attack_speed,
    stamina,
    agility,
    strength,
    dodge_chance,
    crit_chance,
    attack_speed,
    attack_rate_minutes = 1 / 6,
    item_drop_chance = [],
    attack_rate_fight = 1500,
  }: {
    bot: TelegramBot;
    name: string;
    chat_id: number;
    hp: number;
    level: number;
    exp_on_death: number;
    money_on_death: number;
    damage: number;
    armor: number;
    tier: number;
    base_attack_speed: number;
    stamina: number;
    agility: number;
    strength: number;
    dodge_chance: number;
    crit_chance: number;
    attack_speed: number;
    attack_rate_minutes: number;
    item_drop_chance: any[];
    attack_rate_fight: number;
  }) {
    super();

    this.id = Date.now();

    this.bot = bot;
    this.chatId = chat_id;
    this.name = name;
    this.tier = tier;
    this.level = level;

    // STATS
    this.baseHp = hp;
    this.hp = hp + stamina * GameParams.STAMINA_TO_HEALTH_MULTIPLIER;
    this.damage = damage;
    this.armor = armor;
    this.baseAttackSpeed = base_attack_speed;
    this.stamina = stamina;
    this.agility = agility;
    this.strength = strength;
    this.dodgeChance = dodge_chance;
    this.critChance = crit_chance;
    this.attackSpeed = attack_speed;

    // DROP
    this.expOnDeath = exp_on_death;
    this.moneyOnDeath = money_on_death;
    this.itemDropChance = item_drop_chance;

    this.attackRateInFight = attack_rate_fight;
  }

  // Creates enemy from json config
  static fromJson = ({
    bot,
    json,
    chat_id,
    level = 1,
  }: {
    bot: TelegramBot;
    json: any;
    chat_id: number;
    level: number;
  }) => {
    const enemy = new Enemy({
      bot,
      name: json.name,
      chat_id,
      tier: json.tier,
      level,
      // STATS
      hp: json.base_hp * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      armor: json.armor,
      base_attack_speed: json.base_attack_speed,
      stamina: json.stamina * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      agility: json.agility * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      strength: json.strength * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      dodge_chance: json.dodge_chance * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      crit_chance: json.crit_chance * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      attack_speed: json.attack_speed * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      exp_on_death: json.exp_on_death * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      money_on_death: json.money_drop * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      damage: json.damage * (1 + GameParams.NPC_LVL_SCALE_FACTOR * level),
      attack_rate_minutes: json.attack_rate_minutes,
      item_drop_chance: json.item_drop ?? [],
      attack_rate_fight: json.attack_rate_fight,
    });
    return enemy;
  };

  _update = (delta: number) => {
    this._nextAttackTime -= delta;
    this._tryAttack();
  };

  addEffect(effect: IEffect): void {
    this._effects.push(effect);
  }

  removeEffect(effect: IEffect): void {}

  getDropItem = async (): Promise<IItemDocument | null> => {
    const itemDropProbabilities: number[] = [];
    const itemDrops: string[] = [];
    let prevProbability: number = 0;
    this.itemDropChance.forEach((itemChance) => {
      itemDropProbabilities.push(prevProbability + itemChance.chance);
      prevProbability += itemChance.chance;
      itemDrops.push(itemChance.item_name);
    });

    const dropProbability = getRandomInt(0, 100);
    let dropType = 0;
    while (itemDropProbabilities[dropType] <= dropProbability) {
      dropType++;
    }

    if (itemDrops[dropType] === "Nothing") return null;

    const item = await ItemModel.findOne({ name: itemDrops[dropType] });

    switch (item?.__t) {
      case ItemType.WEAPON: {
        (item as IWeaponDocument).quality = getRandomInt(500, GameParams.MAX_ITEM_QUALITY + 1);
        const qualityModifier = (item as IWeaponDocument).quality / GameParams.MAX_ITEM_QUALITY;
        (item as IWeaponDocument).damage *= qualityModifier;
        (item as IWeaponDocument).stamina *= qualityModifier;
        (item as IWeaponDocument).strength *= qualityModifier;
        (item as IWeaponDocument).agility *= qualityModifier;
        (item as IWeaponDocument).attack_speed *= qualityModifier;
        (item as IWeaponDocument).crit_chance *= qualityModifier;
        (item as IWeaponDocument).dodge_chance *= qualityModifier;
        break;
      }
      case ItemType.ARMOR: {
        (item as IArmorDocument).quality = getRandomInt(500, GameParams.MAX_ITEM_QUALITY + 1);
        const qualityModifier = (item as IArmorDocument).quality / GameParams.MAX_ITEM_QUALITY;
        (item as IArmorDocument).armor *= qualityModifier;
        (item as IArmorDocument).stamina *= qualityModifier;
        (item as IArmorDocument).strength *= qualityModifier;
        (item as IArmorDocument).agility *= qualityModifier;
        (item as IArmorDocument).attack_speed *= qualityModifier;
        (item as IArmorDocument).crit_chance *= qualityModifier;
        (item as IArmorDocument).dodge_chance *= qualityModifier;
        break;
      }
    }

    return item;
  };

  stats = (): string => {
    return `
            *${this.name}* - Level ${this.level}\n
            💚 *HP*: ${this.hp.toFixed(1)}\\${this.getMaxHP().toFixed(0)}
            🗡 *Damage*: ${this.damage.toFixed(1)}
            `;
  };

  clearAllIntervals = (): void => {};

  // Unit interface methods
  startAttacking = () => {
    this._nextAttackTime = this.getAttackSpeedDelay();
    this._isAttacking = true;
  };

  stopAttacking = (): void => {
    this._isAttacking = false;
  };

  attack = (targets: IUnit[]): AttackDetails => {
    let target: IUnit;
    do {
      target = targets[getRandomInt(0, targets.length)];
    } while (!target.isAlive());

    let attackDetails = new AttackDetails();
    attackDetails.target = target;
    attackDetails = target.takeDamage(this.getAttackDamage(attackDetails));

    return attackDetails;
  };

  getAttackDamage = (attackDetails: AttackDetails): AttackDetails => {
    attackDetails.modifier = AttackModifier.NORMAL;
    attackDetails.damageDealt =
      this.damage * (1 + this.strength / (GameParams.STRENGTH_TO_DAMAGE_WEIGHT + this.strength));

    // Apply crit damage
    if (Math.random() < this.getCritChance()) {
      attackDetails.damageDealt *= GameParams.DEFAULT_CRIT_MULTIPLIER;
      attackDetails.modifier = AttackModifier.CRITICAL_STRIKE;
    }

    return attackDetails;
  };

  getCritChance = () => {
    let critChance = 0;

    const crit = this.agility + this.critChance;

    critChance = crit / (GameParams.AGILITY_TO_CRIT_WEIGHT + crit);

    return critChance;
  };

  getAttackSpeed = (): number => {
    return this.attackSpeed;
  };

  getAttackSpeedDelay = (): number => {
    const attackSpeed = this.getAttackSpeed();

    const reduction = attackSpeed / (GameParams.ATTACK_SPEED_DELAY_WEIGHT + attackSpeed);

    const delay = this.baseAttackSpeed * (1 - reduction);

    return delay;
  };

  getDodgeChance = () => {
    let dodgeChance = 0;

    const dodge = this.agility + this.dodgeChance;

    dodgeChance = dodge / (GameParams.AGILITY_TO_CRIT_WEIGHT + dodge);

    return dodgeChance;
  };

  getArmorReduction = () => {
    const armor = this.armor;
    return armor / (GameParams.STRENGTH_TO_DAMAGE_WEIGHT + armor);
  };

  getName = (): string => {
    return this.name;
  };

  takeDamage = (attack: AttackDetails) => {
    // Chance to dodge
    if (Math.random() <= this.getDodgeChance()) {
      attack.modifier = AttackModifier.DODGE;
      attack.damageDealt = 0;
      return attack;
    }

    // Armor reduction
    const totalDamage = attack.damageDealt * (1 - this.getArmorReduction());

    this.hp -= totalDamage;
    if (this.hp < 0) {
      this._die();
    }
    attack.damageDealt = totalDamage;

    return attack;
  };

  isAlive = (): boolean => {
    return this.hp > 0;
  };

  getShortStats = (isDead: boolean = false): string => {
    let tier = "";
    for (let i = 0; i < this.tier; i++) {
      tier += "⭐️";
    }
    let name = `${this.getName()}`;
    if (isDead) {
      name = `☠️<del>${name}</del>`;
    }
    const statsText = `<b>${name}</b> \- ${this.level} level ${tier}
    💚${this.hp.toFixed(1)}\\${this.getMaxHP().toFixed(1)} 🗡${this.damage.toFixed(
      1
    )} 🛡${this.armor.toFixed(0)}`;
    return statsText;
  };

  getHpIndicator = (): string => {
    const hpIndicator = `💚${this.hp.toFixed(1)}`;
    return hpIndicator;
  };

  getMaxHP = (): number => {
    return this.baseHp + this.stamina * GameParams.STAMINA_TO_HEALTH_MULTIPLIER;
  };

  getHP = (): number => {
    return this.hp;
  };

  _die(){
    logger.verbose(`${this.getName()} dies`);
    this.hp = 0;
    this._isAttacking = false;
    this.emit(BattleEvents.UNIT_DIED);
  }

  _tryAttack = () => {
    if (this._isAttacking) {
      if (this._nextAttackTime <= 0) {
        this.emit(BattleEvents.UNIT_ATTACKS);
        this._nextAttackTime = this.getAttackSpeedDelay();
      }
    }
  };
}
