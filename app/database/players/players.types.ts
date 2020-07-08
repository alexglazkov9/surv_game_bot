import { Document, Model } from "mongoose";
import { IItem, IWeapon, IArmor, IItemDocument } from "../items/items.types";
import { Enemy } from "../../game/models/units/Enemy";
import { IUnit } from "../../game/models/units/IUnit";

export interface IPlayer {
  telegram_id: number;
  chat_id: number;
  private_chat_id: number;
  name: string;

  health_points: number;

  // Main stats
  stamina: number;
  strength: number;
  agility: number;

  // Character progression
  level: number;
  experience: number;
  stat_points: number;
  statistics: {
    duels: {
      won: number;
      lost: number;
    };
    pve: {
      battles: number;
      last_hits: number;
    };
  };

  // Character possesions
  money: number;
  inventory: IItem[];
  equipment: {
    armor: {
      head: IItem | null;
      necklace: IItem | null;
      rings: IItem | null;
      body: IItem | null;
      hands: IItem | null;
      legs: IItem | null;
      feet: IItem | null;
    };
    weapon: IItem | null;
  };
}

export interface IPlayerDocument extends IPlayer, Document, IUnit {
  // Stats
  getStamina: (this: IPlayerDocument) => number;
  getAgility: (this: IPlayerDocument) => number;
  getStrength: (this: IPlayerDocument) => number;
  getMaxHP: (this: IPlayerDocument) => number;
  getHP: (this: IPlayerDocument) => number;
  getDamage: (this: IPlayerDocument) => number;
  getCritChance: (this: IPlayerDocument) => number;
  getDodgeChance: (this: IPlayerDocument) => number;
  getArmorReduction: (this: IPlayerDocument) => number;
  getAttackSpeedDelay: (this: IPlayerDocument) => number;
  getHPRegeneration: (this: IPlayerDocument) => number;
  getCritMultiplier: (this: IPlayerDocument) => number;

  getAllEquipment: (this: IPlayerDocument) => IArmor[];
  isItemEquiped: (this: IPlayerDocument, id: number) => boolean;

  getMinStats: (this: IPlayerDocument) => string;
  getShortStats: (this: IPlayerDocument, isDead?: boolean) => string;
  recalculateAndSave: (this: IPlayerDocument) => Promise<void>;
  getExpCap: (this: IPlayerDocument) => number;
  getHitDamage: (this: IPlayerDocument) => number;
  takeDamage: (this: IPlayerDocument, dmg: number) => number;
  canAttack: (this: IPlayerDocument, callbackQueryId?: string) => boolean;
  isAlive: (this: IPlayerDocument) => boolean;
  revive: (this: IPlayerDocument) => Promise<void>;
  passiveRegen: (this: IPlayerDocument, percentage: number) => Promise<void>;
  gainAP: (this: IPlayerDocument, baseAmount?: number) => Promise<void>;
  die: (this: IPlayerDocument, save?: boolean) => Promise<void>;
  levelUp: (this: IPlayerDocument, save?: boolean) => Promise<void>;
  sendPlayerStats: (this: IPlayerDocument, messageId: number, callerTId?: number) => Promise<void>;
  getEquipedWeapon: (this: IPlayerDocument) => IWeapon | null;
  getEquipedArmor: (this: IPlayerDocument) => IArmor | null;
  getAttackSpeed: (this: IPlayerDocument, percentage?: boolean) => number;
  addItemToInventory: (this: IPlayerDocument, item: IItemDocument) => Promise<void>;
  gainXP: (this: IPlayerDocument, amount: number) => void;
  gainHP: (this: IPlayerDocument, amount: number, opts?: { isPercentage?: boolean }) => void;
  saveWithRetries: (this: IPlayerDocument) => Promise<void>;
  getLatest: (this: IPlayerDocument) => Promise<IPlayerDocument>;
  // IUnit
  getAttackDamage: (this: IPlayerDocument, opts?: { baseDamage: boolean }) => number;
  getArmor: (this: IPlayerDocument) => number;
  getName: (this: IPlayerDocument) => string;
  attack: (this: IPlayerDocument, target: IUnit) => number;
  startAttacking: (this: IPlayerDocument) => void;
  stopAttacking: (this: IPlayerDocument) => void;
  getHpIndicator: (this: IPlayerDocument) => string;
}

export interface IPlayerModel extends Model<IPlayerDocument> {
  findPlayer: (
    this: IPlayerModel,
    { telegram_id, chat_id }: { telegram_id: number | undefined; chat_id: number | undefined }
  ) => Promise<IPlayerDocument>;

  findPlayerByName: (
    this: IPlayerModel,
    { name }: { name: string }
  ) => Promise<IPlayerDocument | null>;

  createNewPlayer: (
    this: IPlayerModel,
    {
      telegram_id,
      chat_id,
      name,
    }: { telegram_id: number | undefined; chat_id: number | undefined; name: string }
  ) => Promise<IPlayerDocument>;

  playerExists: (
    this: IPlayerModel,
    { telegram_id, chat_id }: { telegram_id: number | undefined; chat_id: number | undefined }
  ) => Promise<boolean>;

  getRandomPlayer: (
    this: IPlayerModel,
    chatId: number,
    alive?: boolean
  ) => Promise<IPlayerDocument>;

  isNameTaken: (this: IPlayerModel, name: string) => Promise<boolean>;

  getAllFromChat: (
    this: IPlayerModel,
    chatId: number,
    alive?: boolean
  ) => Promise<IPlayerDocument[]>;

  getAll: (this: IPlayerModel, alive?: boolean) => Promise<IPlayerDocument[]>;

  getRandomMinMaxLvl: (this: IPlayerModel, chatId: number) => Promise<number>;
}
