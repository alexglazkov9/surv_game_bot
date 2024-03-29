import * as mongoose from "mongoose";
import {
  IItemDocument,
  IItemModel,
  IWeaponModel,
  IConsumableModel,
  IArmorModel,
} from "./items.types";
import { ItemSchema, WeaponSchema, ConsumableSchema, ArmorSchema } from "./items.schema";
import { ItemType } from "../../game/misc/ItemType";

export const ItemModel = mongoose.model<IItemDocument>(ItemType.ITEM, ItemSchema) as IItemModel;

export const WeaponModel = ItemModel.discriminator(ItemType.WEAPON, WeaponSchema) as IWeaponModel;

export const ArmorModel = ItemModel.discriminator(ItemType.ARMOR, ArmorSchema) as IArmorModel;

export const ConsumableModel = ItemModel.discriminator(
  ItemType.CONSUMABLE,
  ConsumableSchema
) as IConsumableModel;

export const ShopItemModel = mongoose.model<IItemDocument>("shop", ItemSchema) as IItemModel;

export const ShopWeaponModel = ShopItemModel.discriminator(
  "shop_weapon",
  WeaponSchema,
  ItemType.WEAPON
) as IWeaponModel;

export const ShopArmorModel = ShopItemModel.discriminator(
  "shop_armor",
  ArmorSchema,
  ItemType.ARMOR
) as IArmorModel;

export const ShopConsumableModel = ShopItemModel.discriminator(
  "shop_consumable",
  ConsumableSchema,
  ItemType.CONSUMABLE
) as IConsumableModel;
