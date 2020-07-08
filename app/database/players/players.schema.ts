import { Schema } from "mongoose";
import {
  findPlayer,
  isNameTaken,
  createNewPlayer,
  playerExists,
  getRandomPlayer,
  getAllFromChat,
  getAll,
  getRandomMinMaxLvl,
  findPlayerByName,
} from "./players.statics";
import {
  recalculateAndSave,
  getExpCap,
  getHitDamage,
  takeDamage,
  canAttack,
  revive,
  passiveRegen,
  gainAP,
  die,
  levelUp,
  getMinStats,
  isAlive,
  getEquipedWeapon,
  getAttackSpeed,
  addItemToInventory,
  gainXP,
  saveWithRetries,
  getEquipedArmor,
  getAttackDamage,
  attack,
  startAttacking,
  getShortStats,
  getName,
  stopAttacking,
  getHpIndicator,
  getArmor,
  gainHP,
  getLatest,
  getMaxHP,
  getStamina,
  getAgility,
  getStrength,
  getDamage,
  getCritChance,
  getDodgeChance,
  getArmorReduction,
  getAttackSpeedDelay,
  getAllEquipment,
  isItemEquiped,
  getHPRegeneration,
  getCritMultiplier,
  getHP,
} from "./players.methods";
import { ItemSchema, WeaponSchema, ConsumableSchema, ArmorSchema } from "../items/items.schema";
import { GameParams } from "../../game/misc/GameParameters";

const PlayerSchema = new Schema({
  telegram_id: Number,
  chat_id: Number,
  private_chat_id: Number,
  name: String,

  health_points: { type: Number, default: GameParams.BASE_HEALTH_POINTS },

  // Main stats
  stamina: { type: Number, default: 0 },
  strength: { type: Number, default: 0 },
  agility: { type: Number, default: 0 },

  // Character progression
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  stat_points: { type: Number, default: 5 },
  statistics: {
    duels: {
      won: { type: Number, deafault: 0 },
      lost: { type: Number, default: 0 },
    },
    pve: {
      battles: { type: Number, default: 0 },
      last_hits: { type: Number, deafault: 0 },
    },
  },

  // Character possesions
  money: { type: Number, default: 0 },
  inventory: {
    type: [ItemSchema],
  },
  equipment: {
    armor: {
      head: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
      necklace: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },

      rings: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
      body: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
      hands: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
      legs: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
      feet: {
        type: Schema.Types.ObjectId,
        default: null,
        // ref: "player.inventory",
      },
    },
    weapon: {
      type: Schema.Types.ObjectId,
      default: null,
      // ref: "player.inventory",
    },
  },
});

(PlayerSchema.path("inventory") as Schema.Types.DocumentArray).discriminator(
  "Weapon",
  WeaponSchema
);
(PlayerSchema.path("inventory") as Schema.Types.DocumentArray).discriminator("Armor", ArmorSchema);
(PlayerSchema.path("inventory") as Schema.Types.DocumentArray).discriminator(
  "Consumable",
  ConsumableSchema
);

// (PlayerSchema.path('equiped_weapon') as Schema.Types.DocumentArray).discriminator("Weapon", WeaponSchema);
// (PlayerSchema.path('equiped_weapon') as Schema.Types.DocumentArray).discriminator("Consumable", ConsumableSchema);

PlayerSchema.statics.findPlayer = findPlayer;
PlayerSchema.statics.findPlayerByName = findPlayerByName;
PlayerSchema.statics.createNewPlayer = createNewPlayer;
PlayerSchema.statics.playerExists = playerExists;
PlayerSchema.statics.getRandomPlayer = getRandomPlayer;
PlayerSchema.statics.isNameTaken = isNameTaken;
PlayerSchema.statics.getAllFromChat = getAllFromChat;
PlayerSchema.statics.getAll = getAll;
PlayerSchema.statics.getRandomMinMaxLvl = getRandomMinMaxLvl;

// Stats
PlayerSchema.methods.getStamina = getStamina;
PlayerSchema.methods.getAgility = getAgility;
PlayerSchema.methods.getStrength = getStrength;
PlayerSchema.methods.getDamage = getDamage;
PlayerSchema.methods.getCritChance = getCritChance;
PlayerSchema.methods.getDodgeChance = getDodgeChance;
PlayerSchema.methods.getMaxHP = getMaxHP;
PlayerSchema.methods.getHP = getHP;
PlayerSchema.methods.getArmorReduction = getArmorReduction;
PlayerSchema.methods.getAttackSpeedDelay = getAttackSpeedDelay;
PlayerSchema.methods.getHPRegeneration = getHPRegeneration;
PlayerSchema.methods.getCritMultiplier = getCritMultiplier;

// Misc
PlayerSchema.methods.getAllEquipment = getAllEquipment;
PlayerSchema.methods.isItemEquiped = isItemEquiped;

PlayerSchema.methods.getMinStats = getMinStats;
PlayerSchema.methods.getShortStats = getShortStats;
PlayerSchema.methods.recalculateAndSave = recalculateAndSave;
PlayerSchema.methods.getExpCap = getExpCap;
PlayerSchema.methods.getHitDamage = getHitDamage;
PlayerSchema.methods.takeDamage = takeDamage;
PlayerSchema.methods.canAttack = canAttack;
PlayerSchema.methods.isAlive = isAlive;
PlayerSchema.methods.revive = revive;
PlayerSchema.methods.passiveRegen = passiveRegen;
PlayerSchema.methods.gainAP = gainAP;
PlayerSchema.methods.die = die;
PlayerSchema.methods.levelUp = levelUp;
// PlayerSchema.methods.sendPlayerStats = sendPlayerStats;
PlayerSchema.methods.getEquipedWeapon = getEquipedWeapon;
PlayerSchema.methods.getEquipedArmor = getEquipedArmor;
PlayerSchema.methods.getAttackSpeed = getAttackSpeed;
PlayerSchema.methods.addItemToInventory = addItemToInventory;
PlayerSchema.methods.gainXP = gainXP;
PlayerSchema.methods.gainHP = gainHP;
PlayerSchema.methods.saveWithRetries = saveWithRetries;
PlayerSchema.methods.getLatest = getLatest;
// IUnit
PlayerSchema.methods.getAttackDamage = getAttackDamage;
PlayerSchema.methods.getArmor = getArmor;
PlayerSchema.methods.getName = getName;
PlayerSchema.methods.attack = attack;
PlayerSchema.methods.startAttacking = startAttacking;
PlayerSchema.methods.stopAttacking = stopAttacking;
PlayerSchema.methods.getHpIndicator = getHpIndicator;

export default PlayerSchema;
