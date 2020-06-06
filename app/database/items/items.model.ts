import { model, Schema } from "mongoose";
import { IItemDocument, IItemModel, IWeaponModel, IConsumableModel } from "./items.types";
import { ItemSchema } from "./items.schema";

export const ItemModel = model<IItemDocument>("item", ItemSchema) as IItemModel;

export const WeaponModel = ItemModel.discriminator('Weapon', new Schema({
    damage: Number,
    durability: Number,
    ap_cost: Number,
})) as IWeaponModel;

export const ConsumableModel = ItemModel.discriminator('Consumable', new Schema({
    charges: Number,
})) as IConsumableModel;
