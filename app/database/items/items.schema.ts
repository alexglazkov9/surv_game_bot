import { Schema } from "mongoose";
import { getItemStats } from "./items.methods";
import { onConsume } from "./consumables.methods";

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

const EffectSchema = new Schema({
  effect: String,
  value: Number,
});

export const ConsumableSchema = new Schema({
  charges: Number,
  onConsumeEffects: [EffectSchema],
});

ItemSchema.methods.getItemStats = getItemStats;

ConsumableSchema.methods.onConsume = onConsume;
