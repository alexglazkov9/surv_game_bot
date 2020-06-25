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
exports.start_game = exports.reg = exports.character = exports.inventory = exports.shop = exports.respawn = exports.spawn_enemy = exports.startGame = void 0;
var app_1 = require("../app");
var GameInstance_1 = require("./model/GameInstance");
var mongoose_1 = require("mongoose");
var logger_1 = require("../utils/logger");
var Shop_1 = require("./model/Shop");
var Inventory_1 = require("./model/Inventory");
var game_instances = {};
function startGame() {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, initAllGameSessions()];
                case 1:
                    _a.sent();
                    // bot.onText(/\/start_game/, async (msg, match) => {
                    //     let opts = {
                    //         reply_to_message_id: msg.message_id,
                    //     }
                    //     let sessionsExists = await db?.SessionModel.sessionExists({ chat_id: msg.chat.id });
                    //     if (sessionsExists) {
                    //         bot.sendMessage(msg.chat.id, "Game is running!", opts);
                    //     } else {
                    //         let session = await db?.SessionModel.createNewSession(msg.chat.id);
                    //         if (session) {
                    //             bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
                    //             game_instances[msg.chat.id] = new GameInstance(msg.chat.id);
                    //             game_instances[msg.chat.id].start();
                    //         } else {
                    //             bot.sendMessage(msg.chat.id, "Something went wrong", opts);
                    //         }
                    //     }
                    // });
                    /*
                        /reg {nickname}
                
                        Creates a new player profile.
                        Doesn't do anyhting if profile exists.
                    */
                    // bot.onText(/^\/reg ?(.*)/, async (msg, match) => {
                    //     if (match && match[1]) {
                    //         let opts: TelegramBot.SendMessageOptions = {
                    //             parse_mode: "Markdown",
                    //             reply_to_message_id: msg.message_id,
                    //         }
                    //         let playerExists = await db?.PlayerModel.playerExists({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
                    //         if (playerExists) {
                    //             bot.sendMessage(msg.chat.id, `You are already in the game.`, opts);
                    //             return;
                    //         }
                    //         if (match[1].length < 3) {
                    //             bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is too short. (Minimum 3 characters)`, opts);
                    //             return;
                    //         }
                    //         let isNameTaken = await db?.PlayerModel.isNameTaken(match[1]);
                    //         if (isNameTaken) {
                    //             bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is already taken.`, opts);
                    //         } else {
                    //             let player = await db?.PlayerModel.createNewPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id, name: match[1] });
                    //             if (player) {
                    //                 bot.sendMessage(msg.chat.id, `Welcome to the game ${player.name}`, opts);
                    //             } else {
                    //                 bot.sendMessage(msg.chat.id, `Something went wrong`, opts);
                    //             }
                    //         }
                    //     } else {
                    //         bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
                    //     }
                    // });
                    // bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, async (msg, match) => {
                    //     let args = msg.text?.split(' ');
                    //     if (args && args[1] != undefined) {
                    //         let player = await db?.PlayerModel.findPlayerByName({ name: args[1], chat_id: msg.chat.id });
                    //         if (player != null) {
                    //             player.sendPlayerStats(msg.message_id, msg.from?.id);
                    //         } else {
                    //             let opts: TelegramBot.SendMessageOptions = {
                    //                 reply_to_message_id: msg.message_id,
                    //                 parse_mode: "Markdown",
                    //             }
                    //             let message = await bot.sendMessage(msg.chat.id, "This character doesn't exist", opts);
                    //             setTimeout(() => {
                    //                 bot.deleteMessage(message.chat.id, message.message_id.toString());
                    //                 bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                    //             }, 5000);
                    //         }
                    //     } else {
                    //         let player = await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
                    //         if (player != null) {
                    //             player.sendPlayerStats(msg.message_id);
                    //         } else {
                    //             let opts: TelegramBot.SendMessageOptions = {
                    //                 reply_to_message_id: msg.message_id,
                    //                 parse_mode: "Markdown",
                    //             }
                    //             let message = await bot.sendMessage(msg.chat.id, "You don't have a character", opts);
                    //             setTimeout(async () => {
                    //                 bot.deleteMessage(message.chat.id, message.message_id.toString());
                    //                 bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                    //             }, 5000);
                    //         }
                    //     }
                    // });
                    //INVENTORY
                    // bot.onText(/^\/inventory@?[A-z]*/, async (msg, match) => {
                    //     if (msg.from != undefined) {
                    //         let inventory = new Inventory({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
                    //         inventory.display();
                    //     }
                    // });
                    //SHOP
                    // bot.onText(/\/shop@?[A-z]*/, async (msg, match) => {
                    //     if (msg.from !== undefined) {
                    //         logger.info(`Shop is being opened for ${msg.from.username} in ${msg.chat.title}`);
                    //         let shop = new Shop({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
                    //         shop.display();
                    //     }
                    // });
                    /*
                        ADMIN COMMANDS - WORK ONLY IN -100116337337
                    */
                    // bot.onText(/\/respawn/, async (msg) => {
                    //     if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
                    //         bot.sendMessage(msg.chat.id, "No cheating here, fag");
                    //         return;
                    //     }
                    //     const players = await db?.PlayerModel.getAllFromChat(msg.chat.id, false);
                    //     players?.forEach((player) => {
                    //         player.revive();
                    //     });
                    // });
                    // bot.onText(/\/spawn_enemy/, async (msg) => {
                    //     if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
                    //         bot.sendMessage(msg.chat.id, "No cheating here, fag");
                    //         return;
                    //     }
                    //     game_instances[msg.chat.id].spawnEnemy();
                    // });
                    app_1.bot.onText(/\/add_item/, function (msg) { return __awaiter(_this, void 0, void 0, function () {
                        var player, inventory, i_1;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
                                        app_1.bot.sendMessage(msg.chat.id, "No cheating here, fag");
                                        return [2 /*return*/];
                                    }
                                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findOne({ telegram_id: (_a = msg.from) === null || _a === void 0 ? void 0 : _a.id, chat_id: msg.chat.id }))];
                                case 1:
                                    player = _b.sent();
                                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.ItemModel.find({}))];
                                case 2:
                                    inventory = _b.sent();
                                    if (inventory !== undefined) {
                                        i_1 = 0;
                                        inventory.forEach(function (item) {
                                            item._id = mongoose_1.Types.ObjectId();
                                            item.isNew = true;
                                            if (player !== undefined && player !== null) {
                                                player.inventory[i_1++] = item;
                                            }
                                        });
                                        player === null || player === void 0 ? void 0 : player.save();
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); });
                    return [2 /*return*/];
            }
        });
    });
}
exports.startGame = startGame;
function spawn_enemy(msg) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
                app_1.bot.sendMessage(msg.chat.id, "No cheating here, fag");
                return [2 /*return*/];
            }
            game_instances[msg.chat.id].spawnEnemy();
            return [2 /*return*/];
        });
    });
}
exports.spawn_enemy = spawn_enemy;
function respawn(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var players;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
                        app_1.bot.sendMessage(msg.chat.id, "No cheating here, fag");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.getAllFromChat(msg.chat.id, false))];
                case 1:
                    players = _a.sent();
                    players === null || players === void 0 ? void 0 : players.forEach(function (player) {
                        player.revive();
                    });
                    return [2 /*return*/];
            }
        });
    });
}
exports.respawn = respawn;
function shop(msg) {
    var _a;
    if (msg.from !== undefined) {
        logger_1.logger.info("Shop is being opened for " + msg.from.username + " in " + msg.chat.title);
        var shop_1 = new Shop_1.Shop({ chat_id: msg.chat.id, from_id: (_a = msg.from) === null || _a === void 0 ? void 0 : _a.id, message_id: msg.message_id });
        shop_1.display();
    }
}
exports.shop = shop;
function inventory(msg) {
    var _a;
    if (msg.from != undefined) {
        var inventory_1 = new Inventory_1.Inventory({ chat_id: msg.chat.id, from_id: (_a = msg.from) === null || _a === void 0 ? void 0 : _a.id, message_id: msg.message_id });
        inventory_1.display();
    }
}
exports.inventory = inventory;
function character(msg) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var args, player, opts, message_1, player, opts, message_2;
        var _this = this;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    args = (_a = msg.text) === null || _a === void 0 ? void 0 : _a.split(' ');
                    if (!(args && args[1] != undefined)) return [3 /*break*/, 5];
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findPlayerByName({ name: args[1], chat_id: msg.chat.id }))];
                case 1:
                    player = _d.sent();
                    if (!(player != null)) return [3 /*break*/, 2];
                    player.sendPlayerStats(msg.message_id, (_b = msg.from) === null || _b === void 0 ? void 0 : _b.id);
                    return [3 /*break*/, 4];
                case 2:
                    opts = {
                        reply_to_message_id: msg.message_id,
                        parse_mode: "Markdown"
                    };
                    return [4 /*yield*/, app_1.bot.sendMessage(msg.chat.id, "This character doesn't exist", opts)];
                case 3:
                    message_1 = _d.sent();
                    setTimeout(function () {
                        app_1.bot.deleteMessage(message_1.chat.id, message_1.message_id.toString());
                        app_1.bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                    }, 5000);
                    _d.label = 4;
                case 4: return [3 /*break*/, 9];
                case 5: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findPlayer({ telegram_id: (_c = msg.from) === null || _c === void 0 ? void 0 : _c.id, chat_id: msg.chat.id }))];
                case 6:
                    player = _d.sent();
                    if (!(player != null)) return [3 /*break*/, 7];
                    player.sendPlayerStats(msg.message_id);
                    return [3 /*break*/, 9];
                case 7:
                    opts = {
                        reply_to_message_id: msg.message_id,
                        parse_mode: "Markdown"
                    };
                    return [4 /*yield*/, app_1.bot.sendMessage(msg.chat.id, "You don't have a character", opts)];
                case 8:
                    message_2 = _d.sent();
                    setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            app_1.bot.deleteMessage(message_2.chat.id, message_2.message_id.toString());
                            app_1.bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                            return [2 /*return*/];
                        });
                    }); }, 5000);
                    _d.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.character = character;
function reg(msg, match) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var opts, playerExists, isNameTaken, player;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!(match && match[1])) return [3 /*break*/, 6];
                    opts = {
                        parse_mode: "Markdown",
                        reply_to_message_id: msg.message_id
                    };
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.playerExists({ telegram_id: (_a = msg.from) === null || _a === void 0 ? void 0 : _a.id, chat_id: msg.chat.id }))];
                case 1:
                    playerExists = _c.sent();
                    if (playerExists) {
                        app_1.bot.sendMessage(msg.chat.id, "You are already in the game.", opts);
                        return [2 /*return*/];
                    }
                    if (match[1].length < 3) {
                        app_1.bot.sendMessage(msg.chat.id, "Nickname \"" + match[1] + "\" is too short. (Minimum 3 characters)", opts);
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.isNameTaken(match[1]))];
                case 2:
                    isNameTaken = _c.sent();
                    if (!isNameTaken) return [3 /*break*/, 3];
                    app_1.bot.sendMessage(msg.chat.id, "Nickname \"" + match[1] + "\" is already taken.", opts);
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.createNewPlayer({ telegram_id: (_b = msg.from) === null || _b === void 0 ? void 0 : _b.id, chat_id: msg.chat.id, name: match[1] }))];
                case 4:
                    player = _c.sent();
                    if (player) {
                        app_1.bot.sendMessage(msg.chat.id, "Welcome to the game " + player.name, opts);
                    }
                    else {
                        app_1.bot.sendMessage(msg.chat.id, "Something went wrong", opts);
                    }
                    _c.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    app_1.bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
                    _c.label = 7;
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.reg = reg;
function start_game(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var opts, sessionsExists, session;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    opts = {
                        reply_to_message_id: msg.message_id
                    };
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.SessionModel.sessionExists({ chat_id: msg.chat.id }))];
                case 1:
                    sessionsExists = _a.sent();
                    if (!sessionsExists) return [3 /*break*/, 2];
                    app_1.bot.sendMessage(msg.chat.id, "Game is running!", opts);
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.SessionModel.createNewSession(msg.chat.id))];
                case 3:
                    session = _a.sent();
                    if (session) {
                        app_1.bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
                        game_instances[msg.chat.id] = new GameInstance_1.GameInstance(msg.chat.id);
                        game_instances[msg.chat.id].start();
                    }
                    else {
                        app_1.bot.sendMessage(msg.chat.id, "Something went wrong", opts);
                    }
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
exports.start_game = start_game;
function initAllGameSessions() {
    return __awaiter(this, void 0, void 0, function () {
        var sessions;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    logger_1.logger.info('Initializing game sessions');
                    return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.SessionModel.getAll())];
                case 1:
                    sessions = _a.sent();
                    sessions === null || sessions === void 0 ? void 0 : sessions.forEach(function (session) {
                        var game = new GameInstance_1.GameInstance(session.chat_id);
                        game_instances[session.chat_id] = game;
                        game.start();
                        logger_1.logger.verbose("Game instance for chat " + game.chat_id + " started");
                    });
                    return [2 /*return*/];
            }
        });
    });
}
