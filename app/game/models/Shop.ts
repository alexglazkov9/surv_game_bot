import { IItemDocument } from "../../database/items/items.types";
import { db, bot } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackData } from "./CallbackData";
import { CallbackActions } from "../misc/CallbackConstants";
import { logger } from "../../utils/logger";
import { Types } from "mongoose";
import { ItemType } from "../../database/items/ItemType";

//Number of columns in the shop
const COL_NUM = 2;
const SHOP_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON];
const SHOP_NAME = 'KORZINKA.UZ';
const SHOP_BUY_BTN_TXT = "💲BUY💲";

export class Shop {
    chat_id: number;
    from_id: number;
    message_id: number;
    shop_message?: TelegramBot.Message;
    items: IItemDocument[] | undefined;
    section_selected_index: number;
    previous_msg_text?: string;

    constructor({ chat_id, from_id, message_id }: { chat_id: number, from_id: number, message_id: number }) {
        this.chat_id = chat_id;
        this.from_id = from_id;
        this.message_id = message_id;
        this.section_selected_index = 0;
    }

    pullItems = async () => {
        //Pull all items to be displayed in the shop
        try {
            this.items = (await db?.ItemModel.find({}));
        } catch (e) {
            logger.error(e);
        }
    }

    display = async () => {
        //Pull items from db if have not been pulled yet
        if (this.items === undefined) {
            await this.pullItems();
        }

        let opts: TelegramBot.SendMessageOptions = {
            reply_to_message_id: this.message_id,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: this.generateShopLayout(),
            },
            disable_notification: true
        }

        this.shop_message = await bot.sendMessage(this.chat_id, this.getStoreHeaderText(), opts);
        bot.on('callback_query', this.onCallbackQuery);
    }

    generateShopLayout = (): TelegramBot.InlineKeyboardButton[][] => {
        let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];
        let inline_keyboard_nav: TelegramBot.InlineKeyboardButton[] = [];

        if (this.items !== undefined) {
            //Filter items by ItemType to display in different sections
            let items_filtered = this.items?.filter((item) => item.__t == SHOP_SECTIONS[this.section_selected_index]);

            let index = 0;
            let row = 0;

            //Generate listings for items
            for (row = 0; row < items_filtered?.length && index < items_filtered?.length; row++) {
                for (let k = 0; k < COL_NUM && index < items_filtered?.length; k++) {
                    if (!inline_keyboard[row]) {
                        inline_keyboard[row] = [];
                    }
                    let callback_data = new CallbackData({ action: CallbackActions.SHOP, telegram_id: this.from_id, payload: items_filtered[index]._id });
                    let data = callback_data.toJson();
                    inline_keyboard[row].push({
                        text: items_filtered[index].name,
                        callback_data: data
                    });
                    index++;
                }
            }

            //Generate navigation buttons

            //NAVIGATION - PREVIOUS PAGE
            let callback_data = new CallbackData({ action: CallbackActions.SHOP_NAV, telegram_id: this.from_id, payload: CallbackActions.SHOP_NAV_PREV });
            let data = callback_data.toJson();
            inline_keyboard_nav.push({
                text: "⏪Prev",
                callback_data: data
            });

            //NAVIGATION - CLOSE SHOP
            callback_data = new CallbackData({ action: CallbackActions.SHOP_NAV, telegram_id: this.from_id, payload: CallbackActions.SHOP_NAV_CLOSE });
            data = callback_data.toJson();
            inline_keyboard_nav.push({
                text: "❌CLOSE",
                callback_data: data
            });

            //NAVIGATION - NEXT PAGE
            callback_data = new CallbackData({ action: CallbackActions.SHOP_NAV, telegram_id: this.from_id, payload: CallbackActions.SHOP_NAV_NEXT });
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

        if (this.shop_message?.message_id != callbackQuery.message?.message_id || data.telegram_id != callbackQuery.from.id) {
            return;
        }

        switch (data.action) {
            //Player clicked on any item
            case CallbackActions.SHOP: {
                let inline_keyboard_buy_btn: TelegramBot.InlineKeyboardButton[] = [];

                let item_id = data.payload;
                let item = this.items?.find((item) => item_id.toString() == item._id);

                let callback_data = new CallbackData({ action: CallbackActions.SHOP_BUY, telegram_id: this.from_id, payload: item?._id });
                let buy_btn_data = callback_data.toJson();
                inline_keyboard_buy_btn = [{ text: SHOP_BUY_BTN_TXT, callback_data: buy_btn_data }];

                let opts: TelegramBot.EditMessageTextOptions = {
                    message_id: this.shop_message?.message_id,
                    chat_id: this.chat_id,
                    parse_mode: "Markdown",
                    reply_markup: {
                        inline_keyboard: [inline_keyboard_buy_btn, ...this.generateShopLayout()]
                    }
                }

                let msg_txt = this.getStoreHeaderText(item);
                if (msg_txt !== this.previous_msg_text) {
                    this.previous_msg_text = msg_txt;
                    bot.editMessageText(msg_txt, opts);
                }

                break;
            }
            //Player clicked BUY button
            case CallbackActions.SHOP_BUY: {
                let player = await db?.PlayerModel.findOne({ telegram_id: data.telegram_id, chat_id: this.chat_id })

                let item_id = data.payload;
                let item = this.items?.find((item) => item._id.toString() == item_id);

                if (item && player) {
                    if (player.money >= item.price) {
                        player.money -= item.price;
                        item._id = new Types.ObjectId();
                        item.isNew = true;
                        player.inventory.push(item);
                        player.save();

                        let opts: TelegramBot.EditMessageTextOptions = {
                            message_id: this.shop_message?.message_id,
                            chat_id: this.chat_id,
                            parse_mode: "Markdown",

                        }

                        bot.editMessageText(`${player?.name} purchased ${item?.name} for ${item?.price}`, opts);
                        this.cleanUp();
                    } else {
                        let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                            callback_query_id: callbackQuery.id,
                            text: "Not enough money",
                            show_alert: false,
                        };
                        bot.answerCallbackQuery(opts_call);
                    }
                } else {
                    logger.warn(`Item [${item}] or player [${player}] is undefined`);
                    this.cleanUp(true);
                }

                break;
            }
            //Player clicked navigation button
            case CallbackActions.SHOP_NAV: {
                switch (data.payload) {
                    case CallbackActions.SHOP_NAV_CLOSE: {
                        let telegram_id = callbackQuery.from.id;
                        let player = await db?.PlayerModel.findOne({ telegram_id, chat_id: this.chat_id });

                        if (player) {
                            let opts: TelegramBot.EditMessageTextOptions = {
                                message_id: this.shop_message?.message_id,
                                chat_id: this.chat_id,
                                parse_mode: "Markdown",
                            }

                            bot.editMessageText(`${player?.name} walked around the shop, but could not afford to buy anything!`, opts);
                            this.cleanUp();
                            return;
                        }
                        break;
                    }
                    case CallbackActions.SHOP_NAV_NEXT: {
                        this.section_selected_index = ++this.section_selected_index % SHOP_SECTIONS.length;
                        break;
                    }
                    case CallbackActions.SHOP_NAV_PREV: {
                        this.section_selected_index--;
                        if (this.section_selected_index < 0) {
                            this.section_selected_index = SHOP_SECTIONS.length - 1;
                        }

                        break;
                    }
                }

                let inline_keyboard = this.generateShopLayout();

                let opts_edit: TelegramBot.EditMessageTextOptions = {
                    parse_mode: "Markdown",
                    chat_id: this.chat_id,
                    message_id: this.shop_message?.message_id,
                    reply_markup: {
                        inline_keyboard: inline_keyboard,
                    },
                };

                let msg_txt = this.getStoreHeaderText();
                if (msg_txt !== this.previous_msg_text) {
                    this.previous_msg_text = msg_txt;
                    bot.editMessageText(msg_txt, opts_edit);
                }

                break;
            }
        }
    }

    getStoreHeaderText = (item?: IItemDocument): string => {
        let section = SHOP_SECTIONS[this.section_selected_index];
        let text = `🏪WELCOME TO *${SHOP_NAME}*🏪\n`;
        text += `Section: *${section}*\n`
        if (item !== undefined) {
            text += `\n${item.getItemStats()}`;
        }

        return text;
    }

    cleanUp = (delete_shop_msg: boolean = false) => {
        if (delete_shop_msg && this.shop_message !== undefined) {
            bot.deleteMessage(this.chat_id, this.shop_message?.message_id.toString());
        }

        bot.deleteMessage(this.chat_id, this.message_id.toString());

        bot.removeListener("callback_query", this.onCallbackQuery);
    }
}