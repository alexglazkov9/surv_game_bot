import { Schema } from "mongoose";
import { getItemStats } from "./items.methods";
import { onConsume } from "./consumables.methods";
import { GameParams } from "../../game/misc/GameParameters";

export const ItemSchema = new Schema({
  name: String,
  price: Number,
});

export const WeaponSchema = new Schema({
  damage: Number,
  base_attack_speed: Number,

  quality: { type: Number, default: GameParams.MAX_ITEM_QUALITY },

  // Stats
  stamina: Number,
  strength: Number,
  agility: Number,

  attack_speed: Number,
  crit_chance: Number,
  dodge_chance: Number,

  // DEPRECATED
  durability: Number,
  ap_cost: Number,
});

export const ArmorSchema = new Schema({
  armor: Number,
  type: String,
  quality: { type: Number, default: GameParams.MAX_ITEM_QUALITY },

  // Stats
  stamina: Number,
  strength: Number,
  agility: Number,

  attack_speed: Number,
  crit_chance: Number,
  dodge_chance: Number,

  // DEPRECATED
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
