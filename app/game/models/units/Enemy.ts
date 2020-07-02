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

const UPDATE_DELAY = 5000;
const ATTACK_CHAT_EVENT = "attack_chat_event";
const ATTACK_FIGHT_EVENT = "attack_fight_event";
const ATTACK_BY_PLAYER = "attack_by_player";
const UPDATE_EVENT = "update_event";
export const ON_DEATH_EVENT = "ON_DEATH_EVENT";

export class Enemy extends EventEmitter.EventEmitter implements INPCUnit {
  id: number;
  bot: TelegramBot;
  chatId: number;
  name: string;
  level: number;
  hpMax: number;
  hp: number;
  damage: number;
  armor: number;
  tier: number;
  messageId?: number;
  expOnDeath: number;
  moneyOnDeath: number;
  attackSpeedPreFight: number;
  attackRateInFight: number;
  attackTimer?: NodeJS.Timeout;
  attackFightTimer?: NodeJS.Timeout;
  itemDropChance: any[];

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
    attack_rate_minutes: number;
    item_drop_chance: any[];
    attack_rate_fight: number;
  }) {
    super();

    this.id = Date.now();

    this.bot = bot;
    this.chatId = chat_id;
    this.name = name;
    this.level = level;
    this.hpMax = hp;
    this.hp = hp;
    this.expOnDeath = exp_on_death;
    this.moneyOnDeath = money_on_death;
    this.damage = damage;
    this.armor = armor;
    this.tier = tier;
    this.attackSpeedPreFight = attack_rate_minutes * 60 * 1000;
    this.attackRateInFight = attack_rate_fight;

    this.itemDropChance = item_drop_chance;
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
      hp: json.hp * (1 + 0.1 * level),
      level,
      armor: json.armor,
      tier: json.tier,
      exp_on_death: (level * json.hp + level * json.damage * 2) / 5,
      money_on_death: json.money_drop * (1 + 0.1 * level),
      damage: json.damage * (1 + 0.1 * level),
      attack_rate_minutes: json.attack_rate_minutes,
      item_drop_chance: json.item_drop ?? [],
      attack_rate_fight: json.attack_rate_fight,
    });
    return enemy;
  };

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
            💚 *HP*: ${this.hp.toFixed(1)}\\${this.hpMax.toFixed(1)}
            🗡 *Damage*: ${this.damage.toFixed(1)}
            `;
  };

  clearAllIntervals = (): void => {
    if (this.attackFightTimer !== undefined) {
      clearInterval(this.attackFightTimer);
    }

    if (this.attackTimer !== undefined) {
      clearInterval(this.attackTimer);
    }
  };

  // Unit interface methods
  startAttacking = () => {
    if (this.attackTimer !== undefined) {
      this.stopAttacking();
    }
    this.attackTimer = setInterval(
      () => this.emit(BattleEvents.UNIT_ATTACKS),
      this.attackRateInFight
    );
  };

  stopAttacking = (): void => {
    if (this.attackTimer !== undefined) {
      clearInterval(this.attackTimer);
      this.attackTimer = undefined;
    }
  };

  attack = (target: IUnit): number => {
    const dmgDealt = target.takeDamage(this.getAttackDamage());
    return dmgDealt;
  };

  getAttackDamage = (): number => {
    return this.damage;
  };

  getAttackSpeed = (): number => {
    return this.attackRateInFight;
  };

  getName = (): string => {
    return this.name;
  };

  takeDamage = (dmg: number) => {
    // Mob armor reduction
    dmg = (1 - this.armor / (GameParams.ARMOR_REDUCTION_WEIGHT + this.armor)) * dmg;

    this.hp -= dmg;
    if (this.hp < 0) {
      this.hp = 0;
    }
    return dmg;
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
    💚${this.hp.toFixed(1)}\\${this.hpMax.toFixed(1)} 🗡${this.damage.toFixed(
      1
    )} 🛡${this.armor.toFixed(0)}`;
    return statsText;
  };

  getHpIndicator = (): string => {
    const hpIndicator = `💚${this.hp.toFixed(1)}`;
    return hpIndicator;
  };
}
