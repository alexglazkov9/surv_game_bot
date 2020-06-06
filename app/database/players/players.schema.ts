import { Schema, Types } from "mongoose";
import { findPlayer, isNameTaken, createNewPlayer, playerExists, getRandomPlayer, getAllFromChat, getAll } from "./players.statics";
import { getPlayerStats, recalculateAndSave, getExpCap, getHitDamage, takeDamage, canAttack, revive, passiveRegen, gainAP, hitEnemy, die, levelUp } from "./players.methods";
import { ItemSchema } from "../items/items.schema";

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
    action_points: { type: Number, default: 0 },
    money: { type: Number, default: 0 },
    inventory: {
        type: [ItemSchema],
    }
});

PlayerSchema.statics.findPlayer = findPlayer;
PlayerSchema.statics.createNewPlayer = createNewPlayer;
PlayerSchema.statics.playerExists = playerExists;
PlayerSchema.statics.getRandomPlayer = getRandomPlayer;
PlayerSchema.statics.isNameTaken = isNameTaken;
PlayerSchema.statics.getAllFromChat = getAllFromChat;
PlayerSchema.statics.getAll = getAll;

PlayerSchema.methods.getPlayerStats = getPlayerStats;
PlayerSchema.methods.recalculateAndSave = recalculateAndSave;
PlayerSchema.methods.getExpCap = getExpCap;
PlayerSchema.methods.getHitDamage = getHitDamage;
PlayerSchema.methods.takeDamage = takeDamage;
PlayerSchema.methods.canAttack = canAttack;
PlayerSchema.methods.revive = revive;
PlayerSchema.methods.passiveRegen = passiveRegen;
PlayerSchema.methods.gainAP = gainAP;
PlayerSchema.methods.hitEnemy = hitEnemy;
PlayerSchema.methods.die = die;
PlayerSchema.methods.levelUp = levelUp;

export default PlayerSchema;