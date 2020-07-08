import * as mongoose from "mongoose";
import { ItemType } from "../../game/misc/ItemType";
import {
  IItemDocument,
  IItemModel,
  IWeaponModel,
  IArmorModel,
  IConsumableModel,
} from "../items/items.types";
import { ItemSchema, WeaponSchema, ArmorSchema, ConsumableSchema } from "../items/items.schema";

// export const ShopModel = mongoose.model<IItemDocument>("shop", ItemSchema) as IItemModel;

// export const ShopWeaponModel = ShopModel.discriminator(
//   ItemType.WEAPON,
//   WeaponSchema
// ) as IWeaponModel;

// export const ArmorModel = ShopModel.discriminator(ItemType.ARMOR, ArmorSchema) as IArmorModel;

// export const ConsumableModel = ShopModel.discriminator(
//   ItemType.CONSUMABLE,
//   ConsumableSchema
// ) as IConsumableModel;
