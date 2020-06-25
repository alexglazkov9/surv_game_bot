"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.getEquipedWeapon = exports.gainXP = exports.gainAP = exports.passiveRegen = exports.revive = exports.isAlive = exports.getAttackSpeed = exports.canAttack = exports.addItemToInventory = exports.hitEnemy = exports.getHitDamage = exports.getExpCap = exports.takeDamage = exports.levelUp = exports.die = exports.saveWithRetries = exports.recalculateAndSave = exports.sendPlayerStats = exports.getPlayerInventory = exports.getShortStats = exports.getPlayerStats = void 0;
var app_1 = require("../../app");
var mongoose_1 = require("mongoose");
var CallbackData_1 = require("../../game/model/CallbackData");
var CallbackConstants_1 = require("../../game/misc/CallbackConstants");
var logger_1 = require("../../utils/logger");
var DEFAULT_ATTACK_SPEED = 5000;
function getPlayerStats() {
    var stats_string = "*" + this.name + "* - " + this.level + " lvl " + (this.health_points <= 0 ? "💀DEAD💀" : "") + "\n\n     \uD83D\uDC9AHP: " + this.health_points.toFixed(1) + "\\" + this.health_points_max.toFixed(1) + "\n     \uD83D\uDEE1Armor: " + this.armor + "\\" + this.armor_max + "\n     \u2747Exp: " + this.experience.toFixed(1) + "\\" + this.getExpCap().toFixed(0) + "\n     \uD83D\uDCB0Cash: " + this.money.toFixed(2) + "\n    ";
    return stats_string;
}
exports.getPlayerStats = getPlayerStats;
function getShortStats() {
    var stats_string = "(\uD83D\uDC9A" + this.health_points.toFixed(1) + ")";
    return stats_string;
}
exports.getShortStats = getShortStats;
function getPlayerInventory() {
}
exports.getPlayerInventory = getPlayerInventory;
function sendPlayerStats(message_id, caller_t_id) {
    if (caller_t_id === void 0) { caller_t_id = undefined; }
    return __awaiter(this, void 0, void 0, function () {
        var inline_keyboard_nav, callback_data, data, inline_keyboard, opts, message_sent, onCallbackQuery;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    inline_keyboard_nav = [];
                    callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.PLAYER_STATS_NAV, telegram_id: caller_t_id !== null && caller_t_id !== void 0 ? caller_t_id : this.telegram_id, payload: CallbackConstants_1.CallbackActions.PLAYERS_STATS_CLOSE });
                    data = callback_data.toJson();
                    inline_keyboard_nav.push({
                        text: "❌CLOSE",
                        callback_data: data
                    });
                    inline_keyboard = [];
                    inline_keyboard.push(inline_keyboard_nav);
                    opts = {
                        reply_to_message_id: message_id,
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: inline_keyboard
                        }
                    };
                    return [4 /*yield*/, app_1.bot.sendMessage(this.chat_id, this.getPlayerStats(), opts)];
                case 1:
                    message_sent = _a.sent();
                    onCallbackQuery = function (callbackQuery) { return __awaiter(_this, void 0, void 0, function () {
                        var action, sender_id, data_1;
                        var _a, _b;
                        return __generator(this, function (_c) {
                            if (message_sent.message_id != ((_a = callbackQuery.message) === null || _a === void 0 ? void 0 : _a.message_id)) {
                                return [2 /*return*/];
                            }
                            action = (_b = callbackQuery.data) !== null && _b !== void 0 ? _b : ' ';
                            sender_id = callbackQuery.from.id;
                            if (action[0] === '{') {
                                data_1 = CallbackData_1.CallbackData.fromJson(action);
                                if (data_1.telegram_id === sender_id && data_1.action == CallbackConstants_1.CallbackActions.PLAYER_STATS_NAV) {
                                    if (data_1.payload === CallbackConstants_1.CallbackActions.PLAYERS_STATS_CLOSE) {
                                        app_1.bot.deleteMessage(callbackQuery.message.chat.id, message_id.toString());
                                        app_1.bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id.toString());
                                        app_1.bot.removeListener('callback_query', onCallbackQuery);
                                    }
                                }
                            }
                            return [2 /*return*/];
                        });
                    }); };
                    app_1.bot.on('callback_query', onCallbackQuery);
                    return [2 /*return*/, Promise.resolve()];
            }
        });
    });
}
exports.sendPlayerStats = sendPlayerStats;
function recalculateAndSave() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (this.health_points <= 0) {
                        this.die();
                    }
                    if (this.experience >= this.getExpCap()) {
                        this.levelUp();
                    }
                    logger_1.logger.debug("Saving player in recalculateAndSave()");
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.recalculateAndSave = recalculateAndSave;
function saveWithRetries() {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    logger_1.logger.debug("Saving with retries");
                    return [4 /*yield*/, this.save()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    e_1 = _a.sent();
                    logger_1.logger.debug("Failed to save, trying again... " + e_1);
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, this.saveWithRetries()];
                            case 1: return [2 /*return*/, _a.sent()];
                        }
                    }); }); }, 1000);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.saveWithRetries = saveWithRetries;
function die(save) {
    if (save === void 0) { save = false; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.health_points = 0;
                    this.action_points /= 2;
                    this.experience = 0;
                    if (!save) return [3 /*break*/, 2];
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    app_1.bot.sendMessage(this.chat_id, this.name + " died like a lil bitch");
                    return [2 /*return*/];
            }
        });
    });
}
exports.die = die;
function levelUp(save) {
    if (save === void 0) { save = false; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    while (this.experience >= this.getExpCap()) {
                        this.experience -= this.getExpCap();
                        this.level++;
                        this.health_points_max += 2;
                        this.ap_gain_rate += 0.1;
                    }
                    if (!save) return [3 /*break*/, 2];
                    logger_1.logger.debug("Saving player in levelUp()");
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2: return [2 /*return*/];
            }
        });
    });
}
exports.levelUp = levelUp;
function takeDamage(dmg) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    //Armor damage reduction
                    if (this.equiped_armor != null) {
                        this.inventory.find(function (item, index) {
                            var _a;
                            if (item._id.toString() == ((_a = _this.equiped_armor) === null || _a === void 0 ? void 0 : _a.toString())) {
                                var armor = item;
                                dmg = dmg - armor.armor;
                                if (dmg < 0) {
                                    dmg = 0;
                                }
                                armor.durability--;
                                if (armor.durability <= 0) {
                                    _this.inventory.splice(index, 1);
                                    _this.equiped_armor = null;
                                }
                                return true;
                            }
                            return false;
                        });
                    }
                    this.health_points -= dmg;
                    return [4 /*yield*/, this.recalculateAndSave()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, dmg];
            }
        });
    });
}
exports.takeDamage = takeDamage;
function getExpCap() {
    return (this.level * 2) + 10 - 2;
}
exports.getExpCap = getExpCap;
function getHitDamage() {
    var dmg = 1;
    var weapon = this.getEquipedWeapon();
    if (weapon != null) {
        dmg = weapon.damage;
    }
    return dmg;
}
exports.getHitDamage = getHitDamage;
function hitEnemy(enemy) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    enemy.takeDamage(this);
                    if (this.equiped_weapon != null) {
                        this.inventory.forEach(function (item, index) {
                            var _a;
                            if (item._id.toString() === ((_a = _this.equiped_weapon) === null || _a === void 0 ? void 0 : _a._id.toString())) {
                                item.durability--;
                                //this.action_points -= (item as IWeapon).ap_cost;
                                if (item.durability <= 0) {
                                    _this.inventory.splice(index, 1);
                                    _this.equiped_weapon = null;
                                }
                            }
                        });
                    }
                    else {
                        //this.action_points--;
                    }
                    return [4 /*yield*/, this.recalculateAndSave()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.hitEnemy = hitEnemy;
function addItemToInventory(item_name) {
    return __awaiter(this, void 0, void 0, function () {
        var item;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.ItemModel.findOne({ name: item_name }))];
                case 1:
                    item = _a.sent();
                    if (item) {
                        item._id = mongoose_1.Types.ObjectId();
                        item.isNew = true;
                        this.inventory.push(item);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.addItemToInventory = addItemToInventory;
function canAttack(callback_query_id) {
    if (callback_query_id === void 0) { callback_query_id = null; }
    var equiped_weapon = this.getEquipedWeapon();
    if (callback_query_id) {
        // if (this.action_points < (equiped_weapon ? equiped_weapon?.ap_cost : 1)) {
        //     let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
        //         callback_query_id: callback_query_id,
        //         text: "Not enough AP",
        //         show_alert: false,
        //     };
        //     bot.answerCallbackQuery(opts_call);
        // } else 
        if (!this.isAlive()) {
            var opts_call = {
                callback_query_id: callback_query_id,
                text: "You are DEAD",
                show_alert: false
            };
            app_1.bot.answerCallbackQuery(opts_call);
        }
    }
    return this.health_points > 0 /*&& this.action_points > (equiped_weapon ? equiped_weapon?.ap_cost : 1)*/;
}
exports.canAttack = canAttack;
function getAttackSpeed() {
    var equiped_weapon = this.getEquipedWeapon();
    if (equiped_weapon) {
        return equiped_weapon.attack_speed;
    }
    else {
        return DEFAULT_ATTACK_SPEED;
    }
}
exports.getAttackSpeed = getAttackSpeed;
function isAlive() {
    return this.health_points > 0;
}
exports.isAlive = isAlive;
function revive() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.health_points = this.health_points_max / 2;
                    logger_1.logger.debug("Saving player in revive()");
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.revive = revive;
function passiveRegen(percentage) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.health_points += this.health_points_max * (percentage / 100);
                    if (this.health_points > this.health_points_max) {
                        this.health_points = this.health_points_max;
                    }
                    logger_1.logger.debug("Saving player in passiveRegen()");
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.passiveRegen = passiveRegen;
function gainAP(base_amount) {
    if (base_amount === void 0) { base_amount = 1; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    this.action_points += this.ap_gain_rate;
                    logger_1.logger.debug("Saving player in gainAp()");
                    return [4 /*yield*/, this.saveWithRetries()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.gainAP = gainAP;
function gainXP(amount) {
    this.experience += amount;
    this.levelUp(false);
}
exports.gainXP = gainXP;
function getEquipedWeapon() {
    var _this = this;
    if (this.equiped_weapon) {
        var weapon = this.inventory.find(function (item) { var _a; return item._id.toString() == ((_a = _this.equiped_weapon) === null || _a === void 0 ? void 0 : _a.toString()); });
        return weapon;
    }
    return null;
}
exports.getEquipedWeapon = getEquipedWeapon;
