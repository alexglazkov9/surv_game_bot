import { Document, Model } from "mongoose";

export interface IItem {
    name: string,
}

export interface IWeapon extends IItem {
    damage: number,
    durability: number,
    ap_cost: number,
}

export interface IConsumable extends IItem {
    charges: number,
}

export interface IItemDocument extends IItem, Document { }

export interface IItemModel extends Model<IItemDocument> { }

export interface IWeaponDocument extends IWeapon, IItemDocument { }

export interface IWeaponModel extends Model<IWeaponDocument> { }

export interface IConsumableDocument extends IConsumable, IItemDocument { }

export interface IConsumableModel extends Model<IConsumableDocument> { }
