"use strict";
exports.__esModule = true;
exports.getItemStats = void 0;
var ItemType_1 = require("./ItemType");
function getItemStats() {
    var stats_string = '';
    switch (this.__t) {
        case ItemType_1.ItemType.WEAPON: {
            var weapon = this;
            stats_string += "*" + weapon.name + "* - _$" + weapon.price + "_\n\n                \uD83D\uDDE1Dmg: *" + weapon.damage + "*\n                \u2699\uFE0FDur: *" + weapon.durability + "*\n                \u26A1\uFE0FSpeed: *" + weapon.attack_speed + "*\n                ";
            break;
        }
        case ItemType_1.ItemType.ARMOR: {
            var armor = this;
            stats_string += "*" + armor.name + "* - _$" + armor.price + "_\n\n                \uD83D\uDEE1Armor: *" + armor.armor + "*\n                \u2699\uFE0FDur: *" + armor.durability + "*\n                ";
            break;
        }
        default: {
            break;
        }
    }
    return stats_string;
}
exports.getItemStats = getItemStats;
