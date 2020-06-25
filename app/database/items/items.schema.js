"use strict";
exports.__esModule = true;
exports.ConsumableSchema = exports.ArmorSchema = exports.WeaponSchema = exports.ItemSchema = void 0;
var mongoose_1 = require("mongoose");
var items_methods_1 = require("./items.methods");
exports.ItemSchema = new mongoose_1.Schema({
    name: String,
    price: Number
});
exports.WeaponSchema = new mongoose_1.Schema({
    damage: Number,
    durability: Number,
    ap_cost: Number,
    attack_speed: Number
});
exports.ArmorSchema = new mongoose_1.Schema({
    armor: Number,
    durability: Number
});
exports.ConsumableSchema = new mongoose_1.Schema({
    charges: Number
});
exports.ItemSchema.methods.getItemStats = items_methods_1.getItemStats;
