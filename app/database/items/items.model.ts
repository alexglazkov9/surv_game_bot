import * as mongoose from "mongoose";
import { IItemDocument, IItemModel, IWeaponModel, IConsumableModel, IArmorModel } from "./items.types";
import { ItemSchema, WeaponSchema, ConsumableSchema, ArmorSchema } from "./items.schema";
import { ItemType } from "./ItemType";



export const ItemModel = mongoose.model<IItemDocument>(ItemType.ITEM, ItemSchema) as IItemModel;

export const WeaponModel = ItemModel.discriminator(ItemType.WEAPON, WeaponSchema) as IWeaponModel;

export const ArmorModel = ItemModel.discriminator(ItemType.ARMOR, ArmorSchema) as IArmorModel;

export const ConsumableModel = ItemModel.discriminator(ItemType.CONSUMABLE, ConsumableSchema) as IConsumableModel;
