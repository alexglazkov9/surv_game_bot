import { Document, Model } from "mongoose";
import { IPlayerDocument } from "../players/players.types";

export interface IItem {
  __t: string;
  _id: any;
  name: string;
  price: number;
}

export interface IWeapon extends IItem {
  damage: number;
  durability: number;
  ap_cost: number;
  attack_speed: number;
}

export interface IArmor extends IItem {
  armor: number;
  durability: number;
}

export interface IConsumableEffect {
  effect: string;
  value: number;
}

export interface IConsumable extends IItem {
  charges: number;
  onConsumeEffects: IConsumableEffect[];
}

export interface IItemDocument extends IItem, Document {
  getItemStats: (this: IItemDocument, options?: { showPrice?: boolean }) => string;
}

export interface IItemModel extends Model<IItemDocument> {}

export interface IWeaponDocument extends IWeapon, IItemDocument {}

export interface IWeaponModel extends Model<IWeaponDocument> {}

export interface IArmorDocument extends IArmor, IItemDocument {}

export interface IArmorModel extends Model<IArmorDocument> {}

export interface IConsumableDocument extends IConsumable, IItemDocument {
  onConsume: (this: IItemDocument, target: IPlayerDocument) => string;
}

export interface IConsumableModel extends Model<IConsumableDocument> {}
