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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
exports.Shop = void 0;
var app_1 = require("../../app");
var CallbackData_1 = require("./CallbackData");
var CallbackConstants_1 = require("../misc/CallbackConstants");
var logger_1 = require("../../utils/logger");
var mongoose_1 = require("mongoose");
var ItemType_1 = require("../../database/items/ItemType");
//Number of columns in the shop
var COL_NUM = 2;
var SHOP_SECTIONS = [ItemType_1.ItemType.ARMOR, ItemType_1.ItemType.WEAPON];
var SHOP_NAME = 'KORZINKA.UZ';
var SHOP_BUY_BTN_TXT = "💲BUY💲";
var Shop = /** @class */ (function () {
    function Shop(_a) {
        var _this = this;
        var chat_id = _a.chat_id, from_id = _a.from_id, message_id = _a.message_id;
        this.pullItems = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = this;
                        return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.ItemModel.find({}))];
                    case 1:
                        _a.items = (_b.sent());
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _b.sent();
                        logger_1.logger.error(e_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.display = function () { return __awaiter(_this, void 0, void 0, function () {
            var opts, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this.items === undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.pullItems()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        opts = {
                            reply_to_message_id: this.message_id,
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: this.generateShopLayout()
                            },
                            disable_notification: true
                        };
                        _a = this;
                        return [4 /*yield*/, app_1.bot.sendMessage(this.chat_id, this.getStoreHeaderText(), opts)];
                    case 3:
                        _a.shop_message = _b.sent();
                        app_1.bot.on('callback_query', this.onCallbackQuery);
                        return [2 /*return*/];
                }
            });
        }); };
        this.generateShopLayout = function () {
            var _a;
            var inline_keyboard = [];
            var inline_keyboard_nav = [];
            if (_this.items !== undefined) {
                //Filter items by ItemType to display in different sections
                var items_filtered = (_a = _this.items) === null || _a === void 0 ? void 0 : _a.filter(function (item) { return item.__t == SHOP_SECTIONS[_this.section_selected_index]; });
                var index = 0;
                var row = 0;
                //Generate listings for items
                for (row = 0; row < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length) && index < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length); row++) {
                    for (var k = 0; k < COL_NUM && index < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length); k++) {
                        if (!inline_keyboard[row]) {
                            inline_keyboard[row] = [];
                        }
                        var callback_data_1 = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.SHOP, telegram_id: _this.from_id, payload: items_filtered[index]._id });
                        var data_1 = callback_data_1.toJson();
                        inline_keyboard[row].push({
                            text: items_filtered[index].name,
                            callback_data: data_1
                        });
                        index++;
                    }
                }
                //Generate navigation buttons
                //NAVIGATION - PREVIOUS PAGE
                var callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.SHOP_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.SHOP_NAV_PREV });
                var data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "⏪Prev",
                    callback_data: data
                });
                //NAVIGATION - CLOSE SHOP
                callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.SHOP_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.SHOP_NAV_CLOSE });
                data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "❌CLOSE",
                    callback_data: data
                });
                //NAVIGATION - NEXT PAGE
                callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.SHOP_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.SHOP_NAV_NEXT });
                data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "Next⏩",
                    callback_data: data
                });
            }
            return __spreadArrays([inline_keyboard_nav], inline_keyboard);
        };
        this.onCallbackQuery = function (callbackQuery) { return __awaiter(_this, void 0, void 0, function () {
            var data, _a, inline_keyboard_buy_btn, item_id_1, item, callback_data, buy_btn_data, opts, msg_txt, player, item_id_2, item, opts, opts_call, _b, telegram_id, player, opts, inline_keyboard, opts_edit, msg_txt;
            var _c, _d, _e, _f, _g, _h, _j, _k;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        data = CallbackData_1.CallbackData.fromJson(callbackQuery.data);
                        if (((_c = this.shop_message) === null || _c === void 0 ? void 0 : _c.message_id) != ((_d = callbackQuery.message) === null || _d === void 0 ? void 0 : _d.message_id) || data.telegram_id != callbackQuery.from.id) {
                            return [2 /*return*/];
                        }
                        _a = data.action;
                        switch (_a) {
                            case CallbackConstants_1.CallbackActions.SHOP: return [3 /*break*/, 1];
                            case CallbackConstants_1.CallbackActions.SHOP_BUY: return [3 /*break*/, 2];
                            case CallbackConstants_1.CallbackActions.SHOP_NAV: return [3 /*break*/, 4];
                        }
                        return [3 /*break*/, 10];
                    case 1:
                        {
                            inline_keyboard_buy_btn = [];
                            item_id_1 = data.payload;
                            item = (_e = this.items) === null || _e === void 0 ? void 0 : _e.find(function (item) { return item_id_1.toString() == item._id; });
                            callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.SHOP_BUY, telegram_id: this.from_id, payload: item === null || item === void 0 ? void 0 : item._id });
                            buy_btn_data = callback_data.toJson();
                            inline_keyboard_buy_btn = [{ text: SHOP_BUY_BTN_TXT, callback_data: buy_btn_data }];
                            opts = {
                                message_id: (_f = this.shop_message) === null || _f === void 0 ? void 0 : _f.message_id,
                                chat_id: this.chat_id,
                                parse_mode: "Markdown",
                                reply_markup: {
                                    inline_keyboard: __spreadArrays([inline_keyboard_buy_btn], this.generateShopLayout())
                                }
                            };
                            msg_txt = this.getStoreHeaderText(item);
                            if (msg_txt !== this.previous_msg_text) {
                                this.previous_msg_text = msg_txt;
                                app_1.bot.editMessageText(msg_txt, opts);
                            }
                            return [3 /*break*/, 10];
                        }
                        _l.label = 2;
                    case 2: return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findOne({ telegram_id: data.telegram_id, chat_id: this.chat_id }))];
                    case 3:
                        player = _l.sent();
                        item_id_2 = data.payload;
                        item = (_g = this.items) === null || _g === void 0 ? void 0 : _g.find(function (item) { return item._id.toString() == item_id_2; });
                        if (item && player) {
                            if (player.money >= item.price) {
                                player.money -= item.price;
                                item._id = new mongoose_1.Types.ObjectId();
                                item.isNew = true;
                                player.inventory.push(item);
                                player.save();
                                opts = {
                                    message_id: (_h = this.shop_message) === null || _h === void 0 ? void 0 : _h.message_id,
                                    chat_id: this.chat_id,
                                    parse_mode: "Markdown"
                                };
                                app_1.bot.editMessageText((player === null || player === void 0 ? void 0 : player.name) + " purchased " + (item === null || item === void 0 ? void 0 : item.name) + " for " + (item === null || item === void 0 ? void 0 : item.price), opts);
                                this.cleanUp();
                            }
                            else {
                                opts_call = {
                                    callback_query_id: callbackQuery.id,
                                    text: "Not enough money",
                                    show_alert: false
                                };
                                app_1.bot.answerCallbackQuery(opts_call);
                            }
                        }
                        else {
                            logger_1.logger.warn("Item [" + item + "] or player [" + player + "] is undefined");
                            this.cleanUp(true);
                        }
                        return [3 /*break*/, 10];
                    case 4:
                        _b = data.payload;
                        switch (_b) {
                            case CallbackConstants_1.CallbackActions.SHOP_NAV_CLOSE: return [3 /*break*/, 5];
                            case CallbackConstants_1.CallbackActions.SHOP_NAV_NEXT: return [3 /*break*/, 7];
                            case CallbackConstants_1.CallbackActions.SHOP_NAV_PREV: return [3 /*break*/, 8];
                        }
                        return [3 /*break*/, 9];
                    case 5:
                        telegram_id = callbackQuery.from.id;
                        return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findOne({ telegram_id: telegram_id, chat_id: this.chat_id }))];
                    case 6:
                        player = _l.sent();
                        if (player) {
                            opts = {
                                message_id: (_j = this.shop_message) === null || _j === void 0 ? void 0 : _j.message_id,
                                chat_id: this.chat_id,
                                parse_mode: "Markdown"
                            };
                            app_1.bot.editMessageText((player === null || player === void 0 ? void 0 : player.name) + " walked around the shop, but could not afford to buy anything!", opts);
                            this.cleanUp();
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 9];
                    case 7:
                        {
                            this.section_selected_index = ++this.section_selected_index % SHOP_SECTIONS.length;
                            return [3 /*break*/, 9];
                        }
                        _l.label = 8;
                    case 8:
                        {
                            this.section_selected_index--;
                            if (this.section_selected_index < 0) {
                                this.section_selected_index = SHOP_SECTIONS.length - 1;
                            }
                            return [3 /*break*/, 9];
                        }
                        _l.label = 9;
                    case 9:
                        inline_keyboard = this.generateShopLayout();
                        opts_edit = {
                            parse_mode: "Markdown",
                            chat_id: this.chat_id,
                            message_id: (_k = this.shop_message) === null || _k === void 0 ? void 0 : _k.message_id,
                            reply_markup: {
                                inline_keyboard: inline_keyboard
                            }
                        };
                        msg_txt = this.getStoreHeaderText();
                        if (msg_txt !== this.previous_msg_text) {
                            this.previous_msg_text = msg_txt;
                            app_1.bot.editMessageText(msg_txt, opts_edit);
                        }
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        }); };
        this.getStoreHeaderText = function (item) {
            var section = SHOP_SECTIONS[_this.section_selected_index];
            var text = "\uD83C\uDFEAWELCOME TO *" + SHOP_NAME + "*\uD83C\uDFEA\n";
            text += "Section: *" + section + "*\n";
            if (item !== undefined) {
                text += "\n" + item.getItemStats();
            }
            return text;
        };
        this.cleanUp = function (delete_shop_msg) {
            var _a;
            if (delete_shop_msg === void 0) { delete_shop_msg = false; }
            if (delete_shop_msg && _this.shop_message !== undefined) {
                app_1.bot.deleteMessage(_this.chat_id, (_a = _this.shop_message) === null || _a === void 0 ? void 0 : _a.message_id.toString());
            }
            app_1.bot.deleteMessage(_this.chat_id, _this.message_id.toString());
            app_1.bot.removeListener("callback_query", _this.onCallbackQuery);
        };
        this.chat_id = chat_id;
        this.from_id = from_id;
        this.message_id = message_id;
        this.section_selected_index = 0;
    }
    return Shop;
}());
exports.Shop = Shop;
