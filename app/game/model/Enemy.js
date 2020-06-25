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
exports.Enemy = void 0;
var app_1 = require("../../app");
var utils_1 = require("../../utils/utils");
var CallbackData_1 = require("./CallbackData");
var CallbackConstants_1 = require("../misc/CallbackConstants");
var logger_1 = require("../../utils/logger");
var EventEmitter = require("events");
var UPDATE_DELAY = 5000;
var Enemy = /** @class */ (function () {
    function Enemy(_a) {
        var _this = this;
        var name = _a.name, chat_id = _a.chat_id, _b = _a.hp, hp = _b === void 0 ? 10 : _b, _c = _a.level, level = _c === void 0 ? 1 : _c, _d = _a.on_death, on_death = _d === void 0 ? function () { } : _d, _e = _a.exp_on_death, exp_on_death = _e === void 0 ? 1 : _e, _f = _a.money_on_death, money_on_death = _f === void 0 ? 0 : _f, _g = _a.damage, damage = _g === void 0 ? 1 : _g, _h = _a.attack_rate_minutes, attack_rate_minutes = _h === void 0 ? 1 / 6 : _h, _j = _a.item_drop_chance, item_drop_chance = _j === void 0 ? [] : _j, _k = _a.attack_rate_fight, attack_rate_fight = _k === void 0 ? 1500 : _k;
        this.attack_timers_players = {};
        /*
            Sends a mob message to the chat and sets up callback_query
            listener that handles attacks from players
        */
        this.spawn = function () { return __awaiter(_this, void 0, void 0, function () {
            var callback_data, opts, message;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.JOIN_FIGHT, telegram_id: undefined, payload: this.id });
                        opts = {
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: 'Join fight',
                                            callback_data: callback_data.toJson()
                                        }
                                    ]
                                ]
                            }
                        };
                        return [4 /*yield*/, app_1.bot.sendMessage(this.chat_id, this.greeting(), opts)];
                    case 1:
                        message = _a.sent();
                        this.message_id = message.message_id;
                        this.attack_timer = setInterval(function () { return _this.emitter.emit('attack_chat'); }, this.attack_rate);
                        this.attack_fight_timer = setInterval(function () { return _this.emitter.emit('attack_fight'); }, this.attack_rate_fight);
                        app_1.bot.on('callback_query', this.onCallbackQuery);
                        this.update_timer = setInterval(function () { return _this.emitter.emit('update'); }, UPDATE_DELAY);
                        logger_1.logger.verbose("Enemy " + this.name + " spawned in " + this.chat_id);
                        this.dealDamage();
                        return [2 /*return*/];
                }
            });
        }); };
        /*
            Listens for players' clicks to join the fight
        */
        this.onCallbackQuery = function (callbackQuery) { return __awaiter(_this, void 0, void 0, function () {
            var callback_data, player_1, opts_call, opts_call;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        callback_data = CallbackData_1.CallbackData.fromJson(callbackQuery.data);
                        if (!(callback_data.action === CallbackConstants_1.CallbackActions.JOIN_FIGHT)) return [3 /*break*/, 3];
                        return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findPlayer({ telegram_id: callbackQuery.from.id, chat_id: this.chat_id }))];
                    case 1: return [4 /*yield*/, (_a.sent())];
                    case 2:
                        player_1 = _a.sent();
                        logger_1.logger.verbose("Player " + (player_1 === null || player_1 === void 0 ? void 0 : player_1.name) + " joined the fight in " + this.chat_id);
                        if (player_1 !== undefined) {
                            if (this.players_fighting.findIndex(function (pl) { return pl.telegram_id === (player_1 === null || player_1 === void 0 ? void 0 : player_1.telegram_id); }) !== -1) {
                                opts_call = {
                                    callback_query_id: callbackQuery.id,
                                    text: "You are in the fight",
                                    show_alert: false
                                };
                                app_1.bot.answerCallbackQuery(opts_call);
                                return [2 /*return*/];
                            }
                            else {
                                //Stop auto-attacking all players
                                if (this.attack_timer !== undefined) {
                                    clearInterval(this.attack_timer);
                                    this.attack_timer = undefined;
                                    this.combat_log += "\n\u2694\uFE0FFIGHT STARTED\u2694\uFE0F\n";
                                }
                                //Add player to the list of attackers
                                this.players_fighting.push(player_1);
                                this.combat_log += "\u2795" + player_1.name + " has joined he fight\n";
                                //Setup player attack handler
                                this.attack_timers_players[player_1.telegram_id] = setTimeout(this.handlePlayerAttack, player_1.getAttackSpeed(), player_1);
                                opts_call = {
                                    callback_query_id: callbackQuery.id,
                                    text: "You joined the fight",
                                    show_alert: false
                                };
                                app_1.bot.answerCallbackQuery(opts_call);
                            }
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.handlePlayerAttack = function (player) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.hp > 0 && player.canAttack())) return [3 /*break*/, 2];
                        this.combat_log += "\uD83D\uDD38 " + player.name + "_" + player.getShortStats() + " deals " + player.getHitDamage().toFixed(1) + " damage_\n";
                        return [4 /*yield*/, player.hitEnemy(this)];
                    case 1:
                        _a.sent();
                        logger_1.logger.verbose("Player " + (player === null || player === void 0 ? void 0 : player.name) + " in " + this.chat_id + " attacked enemy for " + player.getHitDamage().toFixed(1));
                        this.attack_timers_players[player.telegram_id] = setTimeout(this.handlePlayerAttack, player.getAttackSpeed(), player);
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); };
        this.takeDamage = function (player) {
            _this.hp -= player.getHitDamage();
            if (_this.hp <= 0) {
                _this.hp = 0;
                _this.combat_log += "\u2728" + _this.name + " _slained by_ " + player.name + "_" + player.getShortStats() + "\n";
                _this.despawn();
            }
        };
        this.dealDamageInFight = function () { return __awaiter(_this, void 0, void 0, function () {
            var rndIndex, player, dmg_dealt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        rndIndex = utils_1.getRandomInt(0, this.players_fighting.length);
                        player = this.players_fighting[rndIndex];
                        if (!(player != undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, player.takeDamage(this.damage)];
                    case 1:
                        dmg_dealt = _a.sent();
                        logger_1.logger.verbose("Player " + (player === null || player === void 0 ? void 0 : player.name) + " in " + this.chat_id + " was damaged in fight for " + dmg_dealt);
                        this.combat_log += "\uD83D\uDD39 " + this.name + " _deals " + dmg_dealt.toFixed(1) + " damage to_ " + player.name + "_" + player.getShortStats() + "_\n";
                        if (!player.isAlive()) {
                            this.combat_log += "\uD83D\uDD39 " + this.name + " _murdered_ " + player.name + "_" + player.getShortStats() + "_\n";
                            clearInterval(this.attack_timers_players[player.telegram_id]);
                            this.players_fighting.splice(rndIndex, 1);
                            if (this.players_fighting.length === 0) {
                                logger_1.logger.verbose("No more players in " + this.chat_id + ", leaving...");
                                this.despawn();
                            }
                        }
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        }); };
        this.dealDamage = function () { return __awaiter(_this, void 0, void 0, function () {
            var player, dmg_dealt;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getRandomPlayer(this.chat_id, true))];
                    case 1:
                        player = _a.sent();
                        if (!(player != null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, player.takeDamage(this.damage)];
                    case 2:
                        dmg_dealt = _a.sent();
                        logger_1.logger.verbose("Player " + (player === null || player === void 0 ? void 0 : player.name) + " in " + this.chat_id + " was randomly attacked for " + dmg_dealt);
                        this.combat_log += "\uD83D\uDD39 " + this.name + " _deals " + dmg_dealt.toFixed(1) + " damage to_ " + player.name + "_" + player.getShortStats() + "_\n";
                        if (!player.isAlive()) {
                            this.combat_log += "\uD83D\uDD39 " + this.name + " _murdered_ " + player.name + "_" + player.getShortStats() + "_\n";
                            this.despawn();
                        }
                        _a.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.buildMessageText = function () {
            var messageText = '';
            messageText += _this.stats();
            messageText += _this.combat_log;
            return messageText;
        };
        this.greeting = function () {
            return "Wild *" + _this.name + "* spawned!\n";
        };
        this.stats = function () {
            return "\n            *" + _this.name + "* - Level " + _this.level + "\n\n            \uD83D\uDC9A *HP*: " + _this.hp.toFixed(1) + "\\" + _this.hp_max.toFixed(1) + "\n            \uD83D\uDDE1 *Damage*: " + _this.damage.toFixed(1) + "\n            ";
        };
        this.getDroppedItem = function (item_drop_chance) {
            var item_drop_probabilities = [];
            var item_drops = [];
            var prev_porbability = 0;
            item_drop_chance.forEach(function (item_chance) {
                item_drop_probabilities.push(prev_porbability + item_chance.chance);
                prev_porbability += item_chance.chance;
                item_drops.push(item_chance.item_name);
            });
            var drop_probability = utils_1.getRandomInt(0, 100);
            var drop_type = 0;
            while (item_drop_probabilities[drop_type] <= drop_probability) {
                drop_type++;
            }
            if (item_drops[drop_type] == "Nothing")
                return null;
            return item_drops[drop_type];
        };
        this.sendUpdate = function (hide_markup) {
            if (hide_markup === void 0) { hide_markup = false; }
            var callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.JOIN_FIGHT, telegram_id: undefined, payload: _this.id });
            var opts = {
                parse_mode: "Markdown",
                chat_id: _this.chat_id,
                message_id: _this.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Join fight',
                                callback_data: callback_data.toJson()
                            }
                        ]
                    ]
                }
            };
            if (hide_markup) {
                delete opts.reply_markup;
            }
            var message_text = _this.buildMessageText();
            if (_this.previous_message === message_text) {
                return;
            }
            _this.previous_message = message_text;
            app_1.bot.editMessageText(message_text, opts);
        };
        this.rewardPlayers = function () { return __awaiter(_this, void 0, void 0, function () {
            var rndIndex, player, index, _i, _a, player_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        rndIndex = utils_1.getRandomInt(0, this.players_fighting.length);
                        index = 0;
                        _i = 0, _a = this.players_fighting;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        player = _a[_i];
                        player.money += (this.money_on_death / this.players_fighting.length);
                        player.gainXP(this.exp_on_death / this.players_fighting.length);
                        if (!(this.item_drop != null && index === rndIndex)) return [3 /*break*/, 3];
                        player_2 = this.players_fighting[rndIndex];
                        return [4 /*yield*/, player_2.addItemToInventory(this.item_drop)];
                    case 2:
                        _b.sent();
                        this.combat_log += "\uD83D\uDD2E" + player_2.name + " picks up " + this.item_drop + "\n";
                        logger_1.logger.verbose(player_2.name + " picks up " + this.item_drop);
                        _b.label = 3;
                    case 3:
                        logger_1.logger.debug("Saving player in rewardPlayers()");
                        return [4 /*yield*/, player.saveWithRetries()];
                    case 4:
                        _b.sent();
                        index++;
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6:
                        logger_1.logger.verbose("Players get: " + (this.exp_on_death / this.players_fighting.length).toFixed(1) + " exp " + (this.money_on_death > 0 ? ", " + (this.money_on_death / this.players_fighting.length).toFixed(2) + " money" : "") + "_");
                        this.combat_log += "\uD83C\uDF81Players get: " + (this.exp_on_death / this.players_fighting.length).toFixed(1) + " exp " + (this.money_on_death > 0 ? ", " + (this.money_on_death / this.players_fighting.length).toFixed(2) + " money" : "") + "_\n";
                        return [2 /*return*/];
                }
            });
        }); };
        this.despawn = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        logger_1.logger.info("Enemy " + this.name + " is despawning...");
                        app_1.bot.removeListener('callback_query', this.onCallbackQuery);
                        this.clearAllIntervals();
                        if (!(this.hp <= 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.rewardPlayers()];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        this.combat_log += "\uD83D\uDD39 " + this.name + " _left battle_\n";
                        _a.label = 3;
                    case 3:
                        this.sendUpdate(true);
                        this.on_death();
                        return [2 /*return*/];
                }
            });
        }); };
        this.clearAllIntervals = function () {
            if (_this.attack_fight_timer !== undefined) {
                clearInterval(_this.attack_fight_timer);
            }
            if (_this.attack_timer !== undefined) {
                clearInterval(_this.attack_timer);
            }
            if (_this.update_timer !== undefined) {
                clearInterval(_this.update_timer);
            }
            _this.players_fighting.forEach(function (player) {
                clearInterval(_this.attack_timers_players[player.telegram_id]);
            });
        };
        this.id = Date.now();
        this.chat_id = chat_id;
        this.name = name;
        this.level = level;
        this.hp_max = hp;
        this.hp = hp;
        this.exp_on_death = exp_on_death;
        this.money_on_death = money_on_death;
        this.combat_log = '\n📜*Combat Log*\n';
        this.damage = damage;
        this.attack_rate = attack_rate_minutes * 60 * 1000;
        this.item_drop = this.getDroppedItem(item_drop_chance);
        this.on_death = on_death;
        this.players_fighting = [];
        this.attack_rate_fight = attack_rate_fight;
        this.emitter = new EventEmitter.EventEmitter();
        this.emitter.addListener('attack_chat', this.dealDamage);
        this.emitter.addListener('attack_fight', this.dealDamageInFight);
        this.emitter.addListener('update', this.sendUpdate);
    }
    Enemy.fromJson = function (json, chat_id, level, on_death) {
        var _a;
        if (level === void 0) { level = 1; }
        var enemy = new Enemy({
            name: json.name,
            chat_id: chat_id,
            hp: json.hp * (1 + 0.1 * level),
            level: level,
            on_death: on_death,
            exp_on_death: (level * json.hp + level * json.damage * 2) / 5,
            money_on_death: json.money_drop * (1 + 0.1 * level),
            damage: json.damage * (1 + 0.1 * level),
            attack_rate_minutes: json.attack_rate_minutes,
            item_drop_chance: (_a = json.item_drop) !== null && _a !== void 0 ? _a : [],
            attack_rate_fight: json.attack_rate_fight
        });
        return enemy;
    };
    return Enemy;
}());
exports.Enemy = Enemy;
