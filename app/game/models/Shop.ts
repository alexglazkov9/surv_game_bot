import { IItemDocument } from "../../database/items/items.types";
import { db, bot } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackData } from "./CallbackData";
import { CallbackActions } from "../misc/CallbackConstants";
import { logger } from "../../utils/logger";
import { Types } from "mongoose";
import { ItemType } from "../../database/items/ItemType";

// Number of columns in the shop
const COL_NUM = 2;
const SHOP_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON];
const SHOP_NAME = "KORZINKA.UZ";
const SHOP_BUY_BTN_TXT = "💲BUY💲";

export class Shop {
  chatId: number;
  fromId: number;
  messageId: number;
  shopMessage?: TelegramBot.Message;
  items: IItemDocument[] | undefined;
  sectionSelectedIndex: number;
  previousMsgText?: string;

  constructor({
    chat_id,
    from_id,
    message_id,
  }: {
    chat_id: number;
    from_id: number;
    message_id: number;
  }) {
    this.chatId = chat_id;
    this.fromId = from_id;
    this.messageId = message_id;
    this.sectionSelectedIndex = 0;
  }

  pullItems = async () => {
    // Pull all items to be displayed in the shop
    try {
      this.items = await db?.ItemModel.find({});
    } catch (e) {
      logger.error(e);
    }
  };

  display = async () => {
    // Pull items from db if have not been pulled yet
    if (this.items === undefined) {
      await this.pullItems();
    }

    const opts: TelegramBot.SendMessageOptions = {
      reply_to_message_id: this.messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: this.generateShopLayout(),
      },
      disable_notification: true,
    };

    this.shopMessage = await bot.sendMessage(this.chatId, this.getStoreHeaderText(), opts);
    bot.on("callback_query", this.onCallbackQuery);
  };

  generateShopLayout = (): TelegramBot.InlineKeyboardButton[][] => {
    const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [];
    const inlineKeyboardNav: TelegramBot.InlineKeyboardButton[] = [];

    if (this.items !== undefined) {
      // Filter items by ItemType to display in different sections
      const itemsFiltered = this.items?.filter(
        (item) => item.__t === SHOP_SECTIONS[this.sectionSelectedIndex]
      );

      let index = 0;
      let row = 0;

      // Generate listings for items
      for (row = 0; row < itemsFiltered?.length && index < itemsFiltered?.length; row++) {
        for (let k = 0; k < COL_NUM && index < itemsFiltered?.length; k++) {
          if (!inlineKeyboard[row]) {
            inlineKeyboard[row] = [];
          }
          const cbData = new CallbackData({
            action: CallbackActions.SHOP,
            telegram_id: this.fromId,
            payload: itemsFiltered[index]._id,
          });
          const cbDataJson = cbData.toJson();
          inlineKeyboard[row].push({
            text: itemsFiltered[index].name,
            callback_data: cbDataJson,
          });
          index++;
        }
      }

      // Generate navigation buttons

      // NAVIGATION - PREVIOUS PAGE
      let callbackData = new CallbackData({
        action: CallbackActions.SHOP_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.SHOP_NAV_PREV,
      });
      let data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "⏪Prev",
        callback_data: data,
      });

      // NAVIGATION - CLOSE SHOP
      callbackData = new CallbackData({
        action: CallbackActions.SHOP_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.SHOP_NAV_CLOSE,
      });
      data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "❌CLOSE",
        callback_data: data,
      });

      // NAVIGATION - NEXT PAGE
      callbackData = new CallbackData({
        action: CallbackActions.SHOP_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.SHOP_NAV_NEXT,
      });
      data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "Next⏩",
        callback_data: data,
      });
    }

    return [inlineKeyboardNav, ...inlineKeyboard];
  };

  onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const data = CallbackData.fromJson(callbackQuery.data);

    if (
      this.shopMessage?.message_id !== callbackQuery.message?.message_id ||
      data.telegramId !== callbackQuery.from.id
    ) {
      return;
    }

    switch (data.action) {
      // Player clicked on any item
      case CallbackActions.SHOP: {
        let inlineKeyboardBuyBtn: TelegramBot.InlineKeyboardButton[] = [];

        const itemId = data.payload;
        const item = this.items?.find((itm) => itemId.toString() === itm._id.toString());

        const callbackData = new CallbackData({
          action: CallbackActions.SHOP_BUY,
          telegram_id: this.fromId,
          payload: item?._id,
        });
        const buyBtnData = callbackData.toJson();
        inlineKeyboardBuyBtn = [{ text: SHOP_BUY_BTN_TXT, callback_data: buyBtnData }];

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.shopMessage?.message_id,
          chat_id: this.chatId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [inlineKeyboardBuyBtn, ...this.generateShopLayout()],
          },
        };

        const msgTxt = this.getStoreHeaderText(item);
        if (msgTxt !== this.previousMsgText) {
          this.previousMsgText = msgTxt;
          bot.editMessageText(msgTxt, opts);
        }

        break;
      }
      // Player clicked BUY button
      case CallbackActions.SHOP_BUY: {
        const player = await db?.PlayerModel.findOne({
          telegram_id: data.telegramId,
          chat_id: this.chatId,
        });

        const itemId = data.payload;
        const item = this.items?.find((itm) => itm._id.toString() === itemId.toString());

        if (item && player) {
          if (player.money >= item.price) {
            player.money -= item.price;
            item._id = new Types.ObjectId();
            item.isNew = true;
            player.inventory.push(item);
            player.save();

            const opts: TelegramBot.EditMessageTextOptions = {
              message_id: this.shopMessage?.message_id,
              chat_id: this.chatId,
              parse_mode: "Markdown",
            };

            bot.editMessageText(`${player?.name} purchased ${item?.name} for ${item?.price}`, opts);
            this.cleanUp();
          } else {
            const optsCb: TelegramBot.AnswerCallbackQueryOptions = {
              callback_query_id: callbackQuery.id,
              text: "Not enough money",
              show_alert: false,
            };
            bot.answerCallbackQuery(optsCb);
          }
        } else {
          logger.warn(`Item [${item}] or player [${player}] is undefined`);
          this.cleanUp(true);
        }

        break;
      }
      // Player clicked navigation button
      case CallbackActions.SHOP_NAV: {
        switch (data.payload) {
          case CallbackActions.SHOP_NAV_CLOSE: {
            const telegramId = callbackQuery.from.id;
            const player = await db?.PlayerModel.findOne({
              telegram_id: telegramId,
              chat_id: this.chatId,
            });

            if (player) {
              const opts: TelegramBot.EditMessageTextOptions = {
                message_id: this.shopMessage?.message_id,
                chat_id: this.chatId,
                parse_mode: "Markdown",
              };

              bot.editMessageText(
                `${player?.name} walked around the shop, but could not afford to buy anything!`,
                opts
              );
              this.cleanUp();
              return;
            }
            break;
          }
          case CallbackActions.SHOP_NAV_NEXT: {
            this.sectionSelectedIndex = ++this.sectionSelectedIndex % SHOP_SECTIONS.length;
            break;
          }
          case CallbackActions.SHOP_NAV_PREV: {
            this.sectionSelectedIndex--;
            if (this.sectionSelectedIndex < 0) {
              this.sectionSelectedIndex = SHOP_SECTIONS.length - 1;
            }

            break;
          }
        }

        const inlinekeyboard = this.generateShopLayout();

        const optsEdit: TelegramBot.EditMessageTextOptions = {
          parse_mode: "Markdown",
          chat_id: this.chatId,
          message_id: this.shopMessage?.message_id,
          reply_markup: {
            inline_keyboard: inlinekeyboard,
          },
        };

        const msgTxt = this.getStoreHeaderText();
        if (msgTxt !== this.previousMsgText) {
          this.previousMsgText = msgTxt;
          bot.editMessageText(msgTxt, optsEdit);
        }

        break;
      }
    }
  };

  getStoreHeaderText = (item?: IItemDocument): string => {
    const section = SHOP_SECTIONS[this.sectionSelectedIndex];
    let text = `🏪WELCOME TO *${SHOP_NAME}*🏪\n`;
    text += `Section: *${section}*\n`;
    if (item !== undefined) {
      text += `\n${item.getItemStats()}`;
    }

    return text;
  };

  cleanUp = (deleteShopMsg: boolean = false) => {
    if (deleteShopMsg && this.shopMessage !== undefined) {
      bot.deleteMessage(this.chatId, this.shopMessage?.message_id.toString());
    }

    bot.deleteMessage(this.chatId, this.messageId.toString());

    bot.removeListener("callback_query", this.onCallbackQuery);
  };
}
