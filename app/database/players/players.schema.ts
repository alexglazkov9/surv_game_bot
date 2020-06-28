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
  getPlayerStats,
  recalculateAndSave,
  getExpCap,
  getHitDamage,
  takeDamage,
  canAttack,
  revive,
  passiveRegen,
  gainAP,
  hitEnemy,
  die,
  levelUp,
  sendPlayerStats,
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
} from "./players.methods";
import { ItemSchema, WeaponSchema, ConsumableSchema, ArmorSchema } from "../items/items.schema";

const PlayerSchema = new Schema({
  telegram_id: Number,
  chat_id: Number,
  name: String,
  health_points_max: { type: Number, default: 10 },
  health_points: { type: Number, default: 10 },
  armor_max: { type: Number, default: 0 },
  armor: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  action_points: { type: Number, default: 10 },
  ap_gain_rate: { type: Number, default: 1 },
  money: { type: Number, default: 0 },
  inventory: {
    type: [ItemSchema],
  },
  equiped_armor: {
    type: Schema.Types.ObjectId,
    default: null,
    // ref: "player.inventory",
  },
  equiped_weapon: {
    type: Schema.Types.ObjectId,
    default: null,
    // ref: "player.inventory",
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

PlayerSchema.methods.getPlayerStats = getPlayerStats;
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
PlayerSchema.methods.hitEnemy = hitEnemy;
PlayerSchema.methods.die = die;
PlayerSchema.methods.levelUp = levelUp;
PlayerSchema.methods.sendPlayerStats = sendPlayerStats;
PlayerSchema.methods.getEquipedWeapon = getEquipedWeapon;
PlayerSchema.methods.getEquipedArmor = getEquipedArmor;
PlayerSchema.methods.getAttackSpeed = getAttackSpeed;
PlayerSchema.methods.addItemToInventory = addItemToInventory;
PlayerSchema.methods.gainXP = gainXP;
PlayerSchema.methods.saveWithRetries = saveWithRetries;
// IUnit
PlayerSchema.methods.getAttackDamage = getAttackDamage;
PlayerSchema.methods.getArmor = getArmor;
PlayerSchema.methods.getName = getName;
PlayerSchema.methods.attack = attack;
PlayerSchema.methods.startAttacking = startAttacking;
PlayerSchema.methods.stopAttacking = stopAttacking;
PlayerSchema.methods.getHpIndicator = getHpIndicator;

export default PlayerSchema;
