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
exports.Inventory = void 0;
var app_1 = require("../../app");
var logger_1 = require("../../utils/logger");
var CallbackConstants_1 = require("../misc/CallbackConstants");
var CallbackData_1 = require("./CallbackData");
var ItemType_1 = require("../../database/items/ItemType");
//Number of columns in the inventory
var COL_NUM = 2;
var INVENTORY_SECTIONS = [ItemType_1.ItemType.ARMOR, ItemType_1.ItemType.WEAPON];
var Inventory = /** @class */ (function () {
    function Inventory(_a) {
        var _this = this;
        var chat_id = _a.chat_id, from_id = _a.from_id, message_id = _a.message_id;
        this.pullPlayer = function () { return __awaiter(_this, void 0, void 0, function () {
            var _a, e_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        _a = this;
                        return [4 /*yield*/, (app_1.db === null || app_1.db === void 0 ? void 0 : app_1.db.PlayerModel.findPlayer({ telegram_id: this.from_id, chat_id: this.chat_id }))];
                    case 1:
                        _a.player = _b.sent();
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
                        if (!(this.player === undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.pullPlayer()];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        opts = {
                            reply_to_message_id: this.message_id,
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: this.generateLayout()
                            },
                            disable_notification: true
                        };
                        _a = this;
                        return [4 /*yield*/, app_1.bot.sendMessage(this.chat_id, this.getHeaderText(), opts)];
                    case 3:
                        _a.inventory_message = _b.sent();
                        app_1.bot.on('callback_query', this.onCallbackQuery);
                        return [2 /*return*/];
                }
            });
        }); };
        this.generateLayout = function () {
            var inline_keyboard = [];
            var inline_keyboard_nav = [];
            if (_this.player !== undefined) {
                //Filter items by ItemType to display in different sections
                var items_filtered = _this.player.inventory.filter(function (item) { return item.__t === INVENTORY_SECTIONS[_this.section_selected_index]; });
                var index = 0;
                var row = 0;
                if (items_filtered.length !== 0) {
                    //Generate listings for items
                    for (row = 0; row < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length) && index < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length); row++) {
                        for (var k = 0; k < COL_NUM && index < (items_filtered === null || items_filtered === void 0 ? void 0 : items_filtered.length); k++) {
                            if (!inline_keyboard[row]) {
                                inline_keyboard[row] = [];
                            }
                            var item = items_filtered[index];
                            var equiped_item = void 0;
                            var btn_txt = '';
                            //Mark equipped items
                            if (INVENTORY_SECTIONS[_this.section_selected_index] === ItemType_1.ItemType.WEAPON) {
                                equiped_item = _this.player.equiped_weapon;
                                btn_txt = ((equiped_item === null || equiped_item === void 0 ? void 0 : equiped_item._id.toString()) == item._id.toString() ? "🟢" : "") + " " + item.name + " (" + item.durability + ")";
                            }
                            else if (INVENTORY_SECTIONS[_this.section_selected_index] === ItemType_1.ItemType.ARMOR) {
                                equiped_item = _this.player.equiped_armor;
                                btn_txt = ((equiped_item === null || equiped_item === void 0 ? void 0 : equiped_item._id.toString()) == item._id.toString() ? "🟢" : "") + " " + item.name + " (" + item.durability + ")";
                            }
                            var callback_data_1 = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.INVENTORY, telegram_id: _this.from_id, payload: items_filtered[index]._id });
                            var data_1 = callback_data_1.toJson();
                            inline_keyboard[row].push({
                                text: btn_txt,
                                callback_data: data_1
                            });
                            index++;
                        }
                    }
                }
                else {
                    var callback_data_2 = CallbackData_1.CallbackData.createEmpty();
                    inline_keyboard[row] = [{
                            text: "SO EMPTY... WOW",
                            callback_data: callback_data_2.toJson()
                        }];
                }
                //Generate navigation buttons
                //NAVIGATION - PREVIOUS PAGE
                var callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.INVENTORY_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.INVENTORY_NAV_PREV });
                var data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "⏪Prev",
                    callback_data: data
                });
                //NAVIGATION - CLOSE SHOP
                callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.INVENTORY_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.INVENTORY_NAV_CLOSE });
                data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "❌CLOSE",
                    callback_data: data
                });
                //NAVIGATION - NEXT PAGE
                callback_data = new CallbackData_1.CallbackData({ action: CallbackConstants_1.CallbackActions.INVENTORY_NAV, telegram_id: _this.from_id, payload: CallbackConstants_1.CallbackActions.INVENTORY_NAV_NEXT });
                data = callback_data.toJson();
                inline_keyboard_nav.push({
                    text: "Next⏩",
                    callback_data: data
                });
            }
            return __spreadArrays([inline_keyboard_nav], inline_keyboard);
        };
        this.onCallbackQuery = function (callbackQuery) { return __awaiter(_this, void 0, void 0, function () {
            var data, item_id_1, opts, msg_txt, opts, msg_txt;
            var _this = this;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                data = CallbackData_1.CallbackData.fromJson(callbackQuery.data);
                if (((_a = this.inventory_message) === null || _a === void 0 ? void 0 : _a.message_id) != ((_b = callbackQuery.message) === null || _b === void 0 ? void 0 : _b.message_id) || data.telegram_id != callbackQuery.from.id) {
                    return [2 /*return*/];
                }
                switch (data.action) {
                    //Player clicked on any item
                    case CallbackConstants_1.CallbackActions.INVENTORY: {
                        item_id_1 = data.payload;
                        switch (INVENTORY_SECTIONS[this.section_selected_index]) {
                            case ItemType_1.ItemType.WEAPON: {
                                if (this.player) {
                                    this.player.inventory.forEach(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                        var _a, _b, _c;
                                        return __generator(this, function (_d) {
                                            switch (_d.label) {
                                                case 0:
                                                    if (!(item._id == item_id_1)) return [3 /*break*/, 2];
                                                    if (((_b = (_a = this.player) === null || _a === void 0 ? void 0 : _a.equiped_weapon) === null || _b === void 0 ? void 0 : _b.toString()) == item._id.toString()) {
                                                        if (this.player !== undefined)
                                                            this.player.equiped_weapon = null;
                                                    }
                                                    else {
                                                        if (this.player !== undefined)
                                                            this.player.equiped_weapon = item._id;
                                                    }
                                                    return [4 /*yield*/, ((_c = this.player) === null || _c === void 0 ? void 0 : _c.saveWithRetries())];
                                                case 1:
                                                    _d.sent();
                                                    _d.label = 2;
                                                case 2: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                break;
                            }
                            case ItemType_1.ItemType.ARMOR: {
                                if (this.player) {
                                    this.player.inventory.forEach(function (item) { return __awaiter(_this, void 0, void 0, function () {
                                        var _a, _b, _c;
                                        return __generator(this, function (_d) {
                                            switch (_d.label) {
                                                case 0:
                                                    if (!(item._id == item_id_1)) return [3 /*break*/, 2];
                                                    if (((_b = (_a = this.player) === null || _a === void 0 ? void 0 : _a.equiped_armor) === null || _b === void 0 ? void 0 : _b.toString()) == item._id.toString()) {
                                                        if (this.player !== undefined)
                                                            this.player.equiped_armor = null;
                                                    }
                                                    else {
                                                        if (this.player !== undefined)
                                                            this.player.equiped_armor = item._id;
                                                    }
                                                    return [4 /*yield*/, ((_c = this.player) === null || _c === void 0 ? void 0 : _c.saveWithRetries())];
                                                case 1:
                                                    _d.sent();
                                                    _d.label = 2;
                                                case 2: return [2 /*return*/];
                                            }
                                        });
                                    }); });
                                }
                                break;
                            }
                        }
                        opts = {
                            message_id: (_c = this.inventory_message) === null || _c === void 0 ? void 0 : _c.message_id,
                            chat_id: this.chat_id,
                            parse_mode: "Markdown",
                            reply_markup: {
                                inline_keyboard: this.generateLayout()
                            }
                        };
                        msg_txt = this.getHeaderText();
                        if (msg_txt !== this.previous_msg_text || opts != this.previous_opts) {
                            this.previous_msg_text = msg_txt;
                            this.previous_opts = opts;
                            app_1.bot.editMessageText(msg_txt, opts);
                        }
                        break;
                    }
                    //Player clicked navigation button
                    case CallbackConstants_1.CallbackActions.INVENTORY_NAV: {
                        switch (data.payload) {
                            case CallbackConstants_1.CallbackActions.INVENTORY_NAV_CLOSE: {
                                this.cleanUp();
                                return [2 /*return*/];
                            }
                            case CallbackConstants_1.CallbackActions.INVENTORY_NAV_NEXT: {
                                this.section_selected_index = ++this.section_selected_index % INVENTORY_SECTIONS.length;
                                break;
                            }
                            case CallbackConstants_1.CallbackActions.INVENTORY_NAV_PREV: {
                                this.section_selected_index--;
                                if (this.section_selected_index < 0) {
                                    this.section_selected_index = INVENTORY_SECTIONS.length - 1;
                                }
                                break;
                            }
                        }
                        opts = {
                            parse_mode: "Markdown",
                            chat_id: this.chat_id,
                            message_id: (_d = this.inventory_message) === null || _d === void 0 ? void 0 : _d.message_id,
                            reply_markup: {
                                inline_keyboard: this.generateLayout()
                            }
                        };
                        msg_txt = this.getHeaderText();
                        if (msg_txt !== this.previous_msg_text || opts !== this.previous_opts) {
                            this.previous_msg_text = msg_txt;
                            this.previous_opts = opts;
                            app_1.bot.editMessageText(msg_txt, opts);
                        }
                        break;
                    }
                }
                return [2 /*return*/];
            });
        }); };
        this.getHeaderText = function () {
            var _a;
            var text = "Inventory of _" + ((_a = _this.player) === null || _a === void 0 ? void 0 : _a.name) + "_\n";
            text += "Section: *" + INVENTORY_SECTIONS[_this.section_selected_index] + "*";
            return text;
        };
        this.cleanUp = function () {
            var _a;
            if (_this.inventory_message) {
                app_1.bot.deleteMessage(_this.chat_id, (_a = _this.inventory_message) === null || _a === void 0 ? void 0 : _a.message_id.toString());
            }
            app_1.bot.deleteMessage(_this.chat_id, _this.message_id.toString());
            app_1.bot.removeListener('callback_query', _this.onCallbackQuery);
        };
        this.chat_id = chat_id;
        this.from_id = from_id;
        this.message_id = message_id;
        this.section_selected_index = 0;
    }
    return Inventory;
}());
exports.Inventory = Inventory;
