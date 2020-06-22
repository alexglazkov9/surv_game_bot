import { model } from "mongoose";
import { IItemDocument, IItemModel, IWeaponModel, IConsumableModel, IArmorModel } from "./items.types";
import { ItemSchema, WeaponSchema, ConsumableSchema, ArmorSchema } from "./items.schema";

export enum ItemType {
    ITEM = "item",
    WEAPON ="Weapon",
    ARMOR = "Armor",
    CONSUMABLE = "Consumable"
}

export const ItemModel = model<IItemDocument>("item", ItemSchema) as IItemModel;

export const WeaponModel = ItemModel.discriminator(ItemType.WEAPON, WeaponSchema) as IWeaponModel;

export const ArmorModel = ItemModel.discriminator(ItemType.ARMOR, ArmorSchema) as IArmorModel;

export const ConsumableModel = ItemModel.discriminator(ItemType.CONSUMABLE, ConsumableSchema) as IConsumableModel;
