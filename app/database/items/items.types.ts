import { Document, Model } from "mongoose";

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

export interface IConsumable extends IItem {
  charges: number;
}

export interface IItemDocument extends IItem, Document {
  getItemStats: (this: IItemDocument, options?: { showPrice?: boolean }) => string;
}

export interface IItemModel extends Model<IItemDocument> {}

export interface IWeaponDocument extends IWeapon, IItemDocument {}

export interface IWeaponModel extends Model<IWeaponDocument> {}

export interface IArmorDocument extends IArmor, IItemDocument {}

export interface IArmorModel extends Model<IArmorDocument> {}

export interface IConsumableDocument extends IConsumable, IItemDocument {}

export interface IConsumableModel extends Model<IConsumableDocument> {}
