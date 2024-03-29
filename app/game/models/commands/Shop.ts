import { IItemDocument } from "../../../database/items/items.types";
import { db, bot } from "../../../app";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackData } from "../CallbackData";
import { CallbackActions } from "../../misc/CallbackConstants";
import { logger } from "../../../utils/logger";
import { Types } from "mongoose";
import { ItemType } from "../../misc/ItemType";
import { PlayerModel } from "../../../database/players/players.model";
import { ItemModel, ShopItemModel } from "../../../database/items/items.model";
import { IPlayer, IPlayerDocument } from "../../../database/players/players.types";
import { IndicatorsEmojis } from "../../misc/IndicatorsEmojis";

// Number of columns in the shop
const COL_NUM = 2;
const SHOP_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON, ItemType.CONSUMABLE];
const SHOP_NAME = "KORZINKA.UZ";
const SHOP_BUY_BTN_TXT = "💲BUY💲";

export class Shop {
  player: IPlayer;
  shopMessage?: TelegramBot.Message;
  items: IItemDocument[] | undefined;
  sectionSelectedIndex: number;
  previousMsgText?: string;

  constructor({ player }: { player: IPlayer }) {
    this.player = player;
    this.sectionSelectedIndex = 0;
  }

  pullItems = async () => {
    // Pull all items to be displayed in the shop
    try {
      this.items = await ShopItemModel.find({});
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
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: this.generateShopLayout(),
      },
      disable_notification: true,
    };

    this.shopMessage = await bot.sendMessage(
      this.player.private_chat_id,
      await this.getStoreHeaderText(),
      opts
    );
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
            telegram_id: this.player.telegram_id,
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
        telegram_id: this.player.telegram_id,
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
        telegram_id: this.player.telegram_id,
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
        telegram_id: this.player.telegram_id,
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
          telegram_id: this.player.telegram_id,
          payload: item?._id,
        });
        const buyBtnData = callbackData.toJson();
        inlineKeyboardBuyBtn = [{ text: SHOP_BUY_BTN_TXT, callback_data: buyBtnData }];

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.shopMessage?.message_id,
          chat_id: this.player.private_chat_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [inlineKeyboardBuyBtn, ...this.generateShopLayout()],
          },
        };

        const msgTxt = await this.getStoreHeaderText(item);
        if (msgTxt !== this.previousMsgText) {
          this.previousMsgText = msgTxt;
          bot.editMessageText(msgTxt, opts);
        }

        break;
      }
      // Player clicked BUY button
      case CallbackActions.SHOP_BUY: {
        const itemId = data.payload;
        const item = this.items?.find((itm) => itm._id.toString() === itemId.toString());

        if (item && this.player) {
          if (this.player.money >= item.price) {
            this.player.money -= item.price;
            item._id = new Types.ObjectId();
            item.isNew = true;
            this.player.inventory.push(item);
            (this.player as IPlayerDocument).saveWithRetries();

            const opts: TelegramBot.EditMessageTextOptions = {
              message_id: this.shopMessage?.message_id,
              chat_id: this.player.private_chat_id,
              parse_mode: "HTML",
            };

            bot.editMessageText(
              `${this.player?.name} purchased ${item?.name} for ${item?.price}`,
              opts
            );
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
          logger.warn(`Item [${item}] or player [${this.player}] is undefined`);
          this.cleanUp(true);
        }

        break;
      }
      // Player clicked navigation button
      case CallbackActions.SHOP_NAV: {
        switch (data.payload) {
          case CallbackActions.SHOP_NAV_CLOSE: {
            const telegramId = callbackQuery.from.id;

            const opts: TelegramBot.EditMessageTextOptions = {
              message_id: this.shopMessage?.message_id,
              chat_id: this.player.private_chat_id,
              parse_mode: "HTML",
            };

            bot.editMessageText(
              `${this.player?.name} walked around the shop, but could not afford to buy anything!`,
              opts
            );
            this.cleanUp();
            return;
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
          parse_mode: "HTML",
          chat_id: this.player.private_chat_id,
          message_id: this.shopMessage?.message_id,
          reply_markup: {
            inline_keyboard: inlinekeyboard,
          },
        };

        const msgTxt = await this.getStoreHeaderText();
        if (msgTxt !== this.previousMsgText) {
          this.previousMsgText = msgTxt;
          bot.editMessageText(msgTxt, optsEdit);
        }

        break;
      }
    }
  };

  getStoreHeaderText = async (item?: IItemDocument): Promise<string> => {
    const section = SHOP_SECTIONS[this.sectionSelectedIndex];
    let text = `🏪WELCOME TO <b>${SHOP_NAME}</b>🏪\n`;
    text += `<code>Your balance: ${this.player.money.toFixed(2)} <b>${
      IndicatorsEmojis.CURRENCY_MONEY
    }</b></code>\n`;
    text += `\n▶️▶️▶️<b>${section.toUpperCase()}</b>◀️◀️◀️\n`;
    if (item !== undefined) {
      text += `\n${item.getItemStats({ showPrice: true })}`;
    }

    return text;
  };

  cleanUp = (deleteShopMsg: boolean = false) => {
    if (deleteShopMsg && this.shopMessage !== undefined) {
      bot.deleteMessage(this.player.private_chat_id, this.shopMessage?.message_id.toString());
    }

    bot.removeListener("callback_query", this.onCallbackQuery);
  };
}
