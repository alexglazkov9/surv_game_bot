import { Document, Model } from "mongoose";
import { IItem, IWeapon } from "../items/items.types";
import { Enemy } from "../../game/models/Enemy";

export interface IPlayer {
  telegram_id: number;
  chat_id: number;
  name: string;
  health_points_max: number;
  health_points: number;
  armor_max: number;
  armor: number;
  level: number;
  experience: number;
  action_points: number;
  ap_gain_rate: number;
  money: number;
  inventory: IItem[];
  equiped_armor: IItem | null;
  equiped_weapon: IItem | null;
}

export interface IPlayerDocument extends IPlayer, Document {
  getPlayerStats: (this: IPlayerDocument) => string;
  getShortStats: (this: IPlayerDocument) => string;
  recalculateAndSave: (this: IPlayerDocument) => Promise<void>;
  getExpCap: (this: IPlayerDocument) => number;
  getHitDamage: (this: IPlayerDocument) => number;
  takeDamage: (this: IPlayerDocument, dmg: number) => Promise<number>;
  canAttack: (this: IPlayerDocument, callbackQueryId?: string) => boolean;
  isAlive: (this: IPlayerDocument) => boolean;
  revive: (this: IPlayerDocument) => Promise<void>;
  passiveRegen: (this: IPlayerDocument, percentage: number) => Promise<void>;
  gainAP: (this: IPlayerDocument, baseAmount?: number) => Promise<void>;
  hitEnemy: (this: IPlayerDocument, enemy: Enemy) => Promise<void>;
  die: (this: IPlayerDocument, save?: boolean) => Promise<void>;
  levelUp: (this: IPlayerDocument, save?: boolean) => Promise<void>;
  sendPlayerStats: (this: IPlayerDocument, messageId: number, callerTId?: number) => Promise<void>;
  getEquipedWeapon: (this: IPlayerDocument) => IWeapon | null;
  getAttackSpeed: (this: IPlayerDocument) => number;
  addItemToInventory: (this: IPlayerDocument, itemName: string) => Promise<void>;
  gainXP: (this: IPlayerDocument, amount: number) => void;
  saveWithRetries: (this: IPlayerDocument) => Promise<void>;
}

export interface IPlayerModel extends Model<IPlayerDocument> {
  findPlayer: (
    this: IPlayerModel,
    { telegram_id, chat_id }: { telegram_id: number | undefined; chat_id: number | undefined }
  ) => Promise<IPlayerDocument>;

  findPlayerByName: (
    this: IPlayerModel,
    { name, chat_id }: { name: string; chat_id: number }
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
