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
exports.GameInstance = void 0;
var app_1 = require("../../app");
var enemies = require("../../database/enemies/enemies.json");
var utils_1 = require("../../utils/utils");
var Enemy_1 = require("./Enemy");
var logger_1 = require("../../utils/logger");
var GameInstance = /** @class */ (function () {
    function GameInstance(chat_id, respawn_rate_minutes, spawn_rate_minutes, hp_regen_rate_minutes, hp_regen_percentage, ap_gain_rate_minutes) {
        var _this = this;
        if (respawn_rate_minutes === void 0) { respawn_rate_minutes = 60; }
        if (spawn_rate_minutes === void 0) { spawn_rate_minutes = 0.25; }
        if (hp_regen_rate_minutes === void 0) { hp_regen_rate_minutes = 60; }
        if (hp_regen_percentage === void 0) { hp_regen_percentage = 10; }
        if (ap_gain_rate_minutes === void 0) { ap_gain_rate_minutes = 15; }
        this.spawn_timer = undefined;
        this.respawn_timer = undefined;
        this.hp_regen_timer = undefined;
        this.ap_gain_timer = undefined;
        this.start = function () {
            _this.startSpawningEnemies();
            _this.startRevivingPlayers();
            _this.startHpRegen();
            //this.startApIncome();
        };
        this.startSpawningEnemies = function () { return __awaiter(_this, void 0, void 0, function () {
            var msecs;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        msecs = utils_1.getRandomInt(15, 60) * 60 * 1000;
                        logger_1.logger.verbose("Start spawning in " + this.chat_id + " in " + msecs / 1000 + " seconds");
                        return [4 /*yield*/, utils_1.sleep(msecs)];
                    case 1:
                        _a.sent();
                        this.spawnEnemy();
                        return [2 /*return*/];
                }
            });
        }); };
        this.spawnEnemy = function () { return __awaiter(_this, void 0, void 0, function () {
            var enemy_level, enemy_type, enemy;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getRandomMinMaxLvl(this.chat_id))];
                    case 1:
                        enemy_level = (_a = _b.sent()) !== null && _a !== void 0 ? _a : 1;
                        enemy_type = this.getRndEnemyType();
                        while (enemies[enemy_type].min_lvl > enemy_level || enemies[enemy_type].max_lvl < enemy_level) {
                            enemy_type = this.getRndEnemyType();
                        }
                        enemy = Enemy_1.Enemy.fromJson(enemies[enemy_type], this.chat_id, enemy_level, this.startSpawningEnemies);
                        logger_1.logger.verbose("Spawning enemy [" + enemy.name + "] in " + this.chat_id);
                        enemy.spawn();
                        return [2 /*return*/];
                }
            });
        }); };
        this.getRndEnemyType = function () {
            var spawn_probability = utils_1.getRandomInt(0, 100);
            var enemy_type = 0;
            while (_this.spawn_probabilities[enemy_type] <= spawn_probability) {
                enemy_type++;
            }
            return enemy_type;
        };
        this.startRevivingPlayers = function () {
            if (_this.respawn_timer == undefined) {
                clearInterval(_this.respawn_timer);
                _this.respawn_timer = undefined;
            }
            _this.respawn_timer = setInterval(_this.reviveAllPlayers, _this.respawn_rate);
        };
        this.reviveAllPlayers = function () { return __awaiter(_this, void 0, void 0, function () {
            var players;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getAllFromChat(this.chat_id, false))];
                    case 1:
                        players = _a.sent();
                        players === null || players === void 0 ? void 0 : players.forEach(function (player) {
                            player.revive();
                        });
                        app_1.bot.sendMessage(this.chat_id, "\uD83D\uDC7C\uD83C\uDFFFAll players have been respawned.", { disable_notification: true });
                        return [2 /*return*/];
                }
            });
        }); };
        this.startHpRegen = function () {
            if (_this.hp_regen_timer == undefined) {
                clearInterval(_this.hp_regen_timer);
                _this.hp_regen_timer = undefined;
            }
            _this.hp_regen_timer = setInterval(_this.regenHpToAllPlayers, _this.hp_regen_rate);
        };
        this.regenHpToAllPlayers = function () { return __awaiter(_this, void 0, void 0, function () {
            var players;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getAllFromChat(this.chat_id, true))];
                    case 1:
                        players = _a.sent();
                        players === null || players === void 0 ? void 0 : players.forEach(function (player) {
                            player.passiveRegen(_this.hp_regen_percentage);
                        });
                        return [2 /*return*/];
                }
            });
        }); };
        this.startApIncome = function () {
            if (_this.ap_gain_timer == undefined) {
                clearInterval(_this.ap_gain_timer);
                _this.ap_gain_timer = undefined;
            }
            _this.ap_gain_timer = setInterval(_this.grantAPToAllPlayers, _this.ap_gain_rate);
        };
        this.grantAPToAllPlayers = function () { return __awaiter(_this, void 0, void 0, function () {
            var players;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getAllFromChat(this.chat_id, true))];
                    case 1:
                        players = _a.sent();
                        players === null || players === void 0 ? void 0 : players.forEach(function (player) {
                            player.gainAP(1);
                        });
                        return [2 /*return*/];
                }
            });
        }); };
        this.chat_id = chat_id;
        this.respawn_rate = respawn_rate_minutes * 60 * 1000;
        this.spawn_rate = spawn_rate_minutes * 60 * 1000;
        this.hp_regen_rate = hp_regen_rate_minutes * 60 * 1000;
        this.hp_regen_percentage = hp_regen_percentage;
        this.ap_gain_rate = ap_gain_rate_minutes * 60 * 1000;
        this.spawn_probabilities = [];
        var prev_porbability = 0;
        enemies.forEach(function (enemy) {
            _this.spawn_probabilities.push(prev_porbability + enemy.spawn_chance);
            prev_porbability += enemy.spawn_chance;
        });
    }
    return GameInstance;
}());
exports.GameInstance = GameInstance;
