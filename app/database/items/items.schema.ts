import { Schema } from "mongoose";
import { getItemStats } from "./items.methods";

export const ItemSchema = new Schema({
  name: String,
  price: Number,
});

export const WeaponSchema = new Schema({
  damage: Number,
  durability: Number,
  ap_cost: Number,
  attack_speed: Number,
});

export const ArmorSchema = new Schema({
  armor: Number,
  durability: Number,
});

export const ConsumableSchema = new Schema({
  charges: Number,
});

ItemSchema.methods.getItemStats = getItemStats;
