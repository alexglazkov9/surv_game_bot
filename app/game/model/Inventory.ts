import TelegramBot = require("node-telegram-bot-api");
import { IItemDocument, IWeapon, IArmor } from "../../database/items/items.types";
import { IPlayerDocument } from "../../database/players/players.types";
import { db, bot } from "../../app";
import { logger } from "../../utils/logger";
import { CallbackActions } from "../misc/CallbackConstants";
import { CallbackData } from "./CallbackData";
import { ItemType } from "../../database/items/ItemType";

//Number of columns in the inventory
const COL_NUM = 2;
const INVENTORY_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON];

export class Inventory {
    chat_id: number;
    from_id: number;
    message_id: number;
    inventory_message?: TelegramBot.Message;
    items: IItemDocument[] | undefined;
    player: IPlayerDocument | undefined;
    section_selected_index: number;
    previous_msg_text?: string;
    previous_opts?: any;

    constructor({ chat_id, from_id, message_id }: { chat_id: number, from_id: number, message_id: number }) {
        this.chat_id = chat_id;
        this.from_id = from_id;
        this.message_id = message_id;
        this.section_selected_index = 0;
    }

    pullPlayer = async () => {
        //Pull all items to be displayed in the shop
        try {
            this.player = await db?.PlayerModel.findPlayer({ telegram_id: this.from_id, chat_id: this.chat_id });
        } catch (e) {
            logger.error(e);
        }
    }

    display = async () => {
        //Pull items from db if have not been pulled yet
        if (this.player === undefined) {
            await this.pullPlayer();
        }

        let opts: TelegramBot.SendMessageOptions = {
            reply_to_message_id: this.message_id,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: this.generateLayout(),
            },
            disable_notification: true
        }

        this.inventory_message = await bot.sendMessage(this.chat_id, this.getHeaderText(), opts);
        bot.on('callback_query', this.onCallbackQuery);
    }

    generateLayout = (): TelegramBot.InlineKeyboardButton[][] => {
        let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];
        let inline_keyboard_nav: TelegramBot.InlineKeyboardButton[] = [];

        if (this.player !== undefined) {
            //Filter items by ItemType to display in different sections
            let items_filtered = this.player.inventory.filter((item) => item.__t === INVENTORY_SECTIONS[this.section_selected_index]);
            let index = 0;
            let row = 0;

            if (items_filtered.length !== 0) {
                //Generate listings for items
                for (row = 0; row < items_filtered?.length && index < items_filtered?.length; row++) {
                    for (let k = 0; k < COL_NUM && index < items_filtered?.length; k++) {
                        if (!inline_keyboard[row]) {
                            inline_keyboard[row] = [];
                        }

                        let item = items_filtered[index];
                        let equiped_item;
                        let btn_txt: string = '';

                        //Mark equipped items
                        if (INVENTORY_SECTIONS[this.section_selected_index] === ItemType.WEAPON) {
                            equiped_item = this.player.equiped_weapon;
                            btn_txt = `${equiped_item?._id.toString() == item._id.toString() ? "🟢" : ""} ${item.name} (${(item as IWeapon).durability})`;
                        } else if (INVENTORY_SECTIONS[this.section_selected_index] === ItemType.ARMOR) {
                            equiped_item = this.player.equiped_armor;
                            btn_txt = `${equiped_item?._id.toString() == item._id.toString() ? "🟢" : ""} ${item.name} (${(item as IArmor).durability})`;
                        }
                        let callback_data = new CallbackData({ action: CallbackActions.INVENTORY, telegram_id: this.from_id, payload: items_filtered[index]._id });
                        let data = callback_data.toJson();
                        inline_keyboard[row].push({
                            text: btn_txt,
                            callback_data: data
                        });
                        index++;
                    }
                }
            } else {
                let callback_data = CallbackData.createEmpty();
                inline_keyboard[row] = [{
                    text: `SO EMPTY... WOW`,
                    callback_data: callback_data.toJson(),
                }];
            }

            //Generate navigation buttons

            //NAVIGATION - PREVIOUS PAGE
            let callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.from_id, payload: CallbackActions.INVENTORY_NAV_PREV });
            let data = callback_data.toJson();
            inline_keyboard_nav.push({
                text: "⏪Prev",
                callback_data: data
            });

            //NAVIGATION - CLOSE SHOP
            callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.from_id, payload: CallbackActions.INVENTORY_NAV_CLOSE });
            data = callback_data.toJson();
            inline_keyboard_nav.push({
                text: "❌CLOSE",
                callback_data: data
            });

            //NAVIGATION - NEXT PAGE
            callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.from_id, payload: CallbackActions.INVENTORY_NAV_NEXT });
            data = callback_data.toJson();
            inline_keyboard_nav.push({
                text: "Next⏩",
                callback_data: data
            });
        }

        return [inline_keyboard_nav, ...inline_keyboard];
    }

    onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        const data = CallbackData.fromJson(callbackQuery.data);

        if (this.inventory_message?.message_id != callbackQuery.message?.message_id || data.telegram_id != callbackQuery.from.id) {
            return;
        }

        switch (data.action) {
            //Player clicked on any item
            case CallbackActions.INVENTORY: {
                let item_id = data.payload;
                switch (INVENTORY_SECTIONS[this.section_selected_index]) {
                    case ItemType.WEAPON: {
                        if (this.player) {
                            this.player.inventory.forEach(async (item) => {
                                if (item._id == item_id) {
                                    if (this.player?.equiped_weapon?.toString() == item._id.toString()) {
                                        if (this.player !== undefined) this.player.equiped_weapon = null;
                                    } else {
                                        if (this.player !== undefined) this.player.equiped_weapon = item._id;
                                    }
                                    await this.player?.saveWithRetries();
                                }
                            });
                        }
                        break;
                    }
                    case ItemType.ARMOR: {
                        if (this.player) {
                            this.player.inventory.forEach(async (item) => {
                                if (item._id == item_id) {
                                    if (this.player?.equiped_armor?.toString() == item._id.toString()) {
                                        if (this.player !== undefined) this.player.equiped_armor = null;
                                    } else {
                                        if (this.player !== undefined) this.player.equiped_armor = item._id;
                                    }
                                    await this.player?.saveWithRetries();
                                }
                            });
                        }
                        break;
                    }
                }

                let opts: TelegramBot.EditMessageTextOptions = {
                    message_id: this.inventory_message?.message_id,
                    chat_id: this.chat_id,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: this.generateLayout(),
                    }
                }

                let msg_txt = this.getHeaderText();
                if (msg_txt !== this.previous_msg_text || opts != this.previous_opts) {
                    this.previous_msg_text = msg_txt;
                    this.previous_opts = opts;
                    bot.editMessageText(msg_txt, opts);
                }

                break;
            }
            //Player clicked navigation button
            case CallbackActions.INVENTORY_NAV: {
                switch (data.payload) {
                    case CallbackActions.INVENTORY_NAV_CLOSE: {
                        this.cleanUp();
                        return;
                    }
                    case CallbackActions.INVENTORY_NAV_NEXT: {
                        this.section_selected_index = ++this.section_selected_index % INVENTORY_SECTIONS.length;

                        break;
                    }
                    case CallbackActions.INVENTORY_NAV_PREV: {
                        this.section_selected_index--;
                        if (this.section_selected_index < 0) {
                            this.section_selected_index = INVENTORY_SECTIONS.length - 1;
                        }

                        break;
                    }
                }

                let opts: TelegramBot.EditMessageTextOptions = {
                    parse_mode: "Markdown",
                    chat_id: this.chat_id,
                    message_id: this.inventory_message?.message_id,
                    reply_markup: {
                        inline_keyboard: this.generateLayout(),
                    },
                };

                let msg_txt = this.getHeaderText();
                if (msg_txt !== this.previous_msg_text || opts !== this.previous_opts) {
                    this.previous_msg_text = msg_txt;
                    this.previous_opts = opts;
                    bot.editMessageText(msg_txt, opts);
                }

                break;
            }
        }
    }

    getHeaderText = (): string => {
        let text = `Inventory of _${this.player?.name}_\n`;
        text += `Section: *${INVENTORY_SECTIONS[this.section_selected_index]}*`;
        return text;
    }

    cleanUp = () => {
        if (this.inventory_message) {
            bot.deleteMessage(this.chat_id, this.inventory_message?.message_id.toString());
        }

        bot.deleteMessage(this.chat_id, this.message_id.toString());

        bot.removeListener('callback_query', this.onCallbackQuery);
    }
}