"use strict";
exports.__esModule = true;
var mongoose_1 = require("mongoose");
var players_statics_1 = require("./players.statics");
var players_methods_1 = require("./players.methods");
var items_schema_1 = require("../items/items.schema");
var PlayerSchema = new mongoose_1.Schema({
    telegram_id: Number,
    chat_id: Number,
    name: String,
    health_points_max: { type: Number, "default": 10 },
    health_points: { type: Number, "default": 10 },
    armor_max: { type: Number, "default": 0 },
    armor: { type: Number, "default": 0 },
    level: { type: Number, "default": 1 },
    experience: { type: Number, "default": 0 },
    action_points: { type: Number, "default": 10 },
    ap_gain_rate: { type: Number, "default": 1 },
    money: { type: Number, "default": 0 },
    inventory: {
        type: [items_schema_1.ItemSchema]
    },
    equiped_armor: {
        type: mongoose_1.Schema.Types.ObjectId,
        "default": null
    },
    equiped_weapon: {
        type: mongoose_1.Schema.Types.ObjectId,
        "default": null
    }
});
PlayerSchema.path('inventory').discriminator("Weapon", items_schema_1.WeaponSchema);
PlayerSchema.path('inventory').discriminator("Armor", items_schema_1.ArmorSchema);
PlayerSchema.path('inventory').discriminator("Consumable", items_schema_1.ConsumableSchema);
// (PlayerSchema.path('equiped_weapon') as Schema.Types.DocumentArray).discriminator("Weapon", WeaponSchema);
// (PlayerSchema.path('equiped_weapon') as Schema.Types.DocumentArray).discriminator("Consumable", ConsumableSchema);
PlayerSchema.statics.findPlayer = players_statics_1.findPlayer;
PlayerSchema.statics.findPlayerByName = players_statics_1.findPlayerByName;
PlayerSchema.statics.createNewPlayer = players_statics_1.createNewPlayer;
PlayerSchema.statics.playerExists = players_statics_1.playerExists;
PlayerSchema.statics.getRandomPlayer = players_statics_1.getRandomPlayer;
PlayerSchema.statics.isNameTaken = players_statics_1.isNameTaken;
PlayerSchema.statics.getAllFromChat = players_statics_1.getAllFromChat;
PlayerSchema.statics.getAll = players_statics_1.getAll;
PlayerSchema.statics.getRandomMinMaxLvl = players_statics_1.getRandomMinMaxLvl;
PlayerSchema.methods.getPlayerStats = players_methods_1.getPlayerStats;
PlayerSchema.methods.getShortStats = players_methods_1.getShortStats;
PlayerSchema.methods.recalculateAndSave = players_methods_1.recalculateAndSave;
PlayerSchema.methods.getExpCap = players_methods_1.getExpCap;
PlayerSchema.methods.getHitDamage = players_methods_1.getHitDamage;
PlayerSchema.methods.takeDamage = players_methods_1.takeDamage;
PlayerSchema.methods.canAttack = players_methods_1.canAttack;
PlayerSchema.methods.isAlive = players_methods_1.isAlive;
PlayerSchema.methods.revive = players_methods_1.revive;
PlayerSchema.methods.passiveRegen = players_methods_1.passiveRegen;
PlayerSchema.methods.gainAP = players_methods_1.gainAP;
PlayerSchema.methods.hitEnemy = players_methods_1.hitEnemy;
PlayerSchema.methods.die = players_methods_1.die;
PlayerSchema.methods.levelUp = players_methods_1.levelUp;
PlayerSchema.methods.sendPlayerStats = players_methods_1.sendPlayerStats;
PlayerSchema.methods.getEquipedWeapon = players_methods_1.getEquipedWeapon;
PlayerSchema.methods.getAttackSpeed = players_methods_1.getAttackSpeed;
PlayerSchema.methods.addItemToInventory = players_methods_1.addItemToInventory;
PlayerSchema.methods.gainXP = players_methods_1.gainXP;
PlayerSchema.methods.saveWithRetries = players_methods_1.saveWithRetries;
exports["default"] = PlayerSchema;
