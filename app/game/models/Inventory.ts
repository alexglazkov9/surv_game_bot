import TelegramBot = require("node-telegram-bot-api");
import { IItemDocument, IWeapon, IArmor } from "../../database/items/items.types";
import { IPlayerDocument } from "../../database/players/players.types";
import { db, bot } from "../../app";
import { logger } from "../../utils/logger";
import { CallbackActions } from "../misc/CallbackConstants";
import { CallbackData } from "./CallbackData";
import { ItemType } from "../../database/items/ItemType";

// Number of columns in the inventory
const COL_NUM = 2;
const INVENTORY_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON];

export class Inventory {
  chatId: number;
  fromId: number;
  messageId: number;
  inventoryMessage?: TelegramBot.Message;
  items: IItemDocument[] | undefined;
  player: IPlayerDocument | undefined;
  sectionSelectedIndex: number;
  previousMsgText?: string;
  previousOpts?: any;

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

  pullPlayer = async () => {
    // Pull all items to be displayed in the shop
    try {
      this.player = await db?.PlayerModel.findPlayer({
        telegram_id: this.fromId,
        chat_id: this.chatId,
      });
    } catch (e) {
      logger.error(e);
    }
  };

  display = async () => {
    // Pull items from db if have not been pulled yet
    if (this.player === undefined) {
      await this.pullPlayer();
    }

    const opts: TelegramBot.SendMessageOptions = {
      reply_to_message_id: this.messageId,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: this.generateLayout(),
      },
      disable_notification: true,
    };

    this.inventoryMessage = await bot.sendMessage(this.chatId, this.getHeaderText(), opts);
    bot.on("callback_query", this.onCallbackQuery);
  };

  generateLayout = (): TelegramBot.InlineKeyboardButton[][] => {
    const inlinekeyboard: TelegramBot.InlineKeyboardButton[][] = [];
    const inlineKeyboardNav: TelegramBot.InlineKeyboardButton[] = [];

    if (this.player !== undefined) {
      // Filter items by ItemType to display in different sections
      const itemsFiltered = this.player.inventory.filter(
        (item) => item.__t === INVENTORY_SECTIONS[this.sectionSelectedIndex]
      );
      let index = 0;
      let row = 0;

      if (itemsFiltered.length !== 0) {
        // Generate listings for items
        for (row = 0; row < itemsFiltered?.length && index < itemsFiltered?.length; row++) {
          for (let k = 0; k < COL_NUM && index < itemsFiltered?.length; k++) {
            if (!inlinekeyboard[row]) {
              inlinekeyboard[row] = [];
            }

            const item = itemsFiltered[index];
            let equipedItem;
            let btnTxt: string = "";

            // Mark equipped items
            if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.WEAPON) {
              equipedItem = this.player.equiped_weapon;
              btnTxt = `${equipedItem?._id.toString() === item._id.toString() ? "🟢" : ""} ${
                item.name
              } (${(item as IWeapon).durability})`;
            } else if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.ARMOR) {
              equipedItem = this.player.equiped_armor;
              btnTxt = `${equipedItem?._id.toString() === item._id.toString() ? "🟢" : ""} ${
                item.name
              } (${(item as IArmor).durability})`;
            }
            const cbData = new CallbackData({
              action: CallbackActions.INVENTORY,
              telegram_id: this.fromId,
              payload: itemsFiltered[index]._id,
            });
            const cbDataJson = cbData.toJson();
            inlinekeyboard[row].push({
              text: btnTxt,
              callback_data: cbDataJson,
            });
            index++;
          }
        }
      } else {
        const emptyCbData = CallbackData.createEmpty();
        inlinekeyboard[row] = [
          {
            text: `SO EMPTY... WOW`,
            callback_data: emptyCbData.toJson(),
          },
        ];
      }

      // Generate navigation buttons

      // NAVIGATION - PREVIOUS PAGE
      let callbackData = new CallbackData({
        action: CallbackActions.INVENTORY_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.INVENTORY_NAV_PREV,
      });
      let data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "⏪Prev",
        callback_data: data,
      });

      // NAVIGATION - CLOSE SHOP
      callbackData = new CallbackData({
        action: CallbackActions.INVENTORY_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.INVENTORY_NAV_CLOSE,
      });
      data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "❌CLOSE",
        callback_data: data,
      });

      // NAVIGATION - NEXT PAGE
      callbackData = new CallbackData({
        action: CallbackActions.INVENTORY_NAV,
        telegram_id: this.fromId,
        payload: CallbackActions.INVENTORY_NAV_NEXT,
      });
      data = callbackData.toJson();
      inlineKeyboardNav.push({
        text: "Next⏩",
        callback_data: data,
      });
    }

    return [inlineKeyboardNav, ...inlinekeyboard];
  };

  onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const data = CallbackData.fromJson(callbackQuery.data);

    if (
      this.inventoryMessage?.message_id !== callbackQuery.message?.message_id ||
      data.telegramId !== callbackQuery.from.id
    ) {
      return;
    }

    switch (data.action) {
      // Player clicked on any item
      case CallbackActions.INVENTORY: {
        const itemId = data.payload;
        switch (INVENTORY_SECTIONS[this.sectionSelectedIndex]) {
          case ItemType.WEAPON: {
            if (this.player) {
              this.player.inventory.forEach(async (item) => {
                if (item._id === itemId) {
                  if (this.player?.equiped_weapon?.toString() === item._id.toString()) {
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
                if (item._id === itemId) {
                  if (this.player?.equiped_armor?.toString() === item._id.toString()) {
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

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.inventoryMessage?.message_id,
          chat_id: this.chatId,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: this.generateLayout(),
          },
        };

        const msgTxt = this.getHeaderText();
        if (msgTxt !== this.previousMsgText || opts !== this.previousOpts) {
          this.previousMsgText = msgTxt;
          this.previousOpts = opts;
          bot.editMessageText(msgTxt, opts);
        }

        break;
      }
      // Player clicked navigation button
      case CallbackActions.INVENTORY_NAV: {
        switch (data.payload) {
          case CallbackActions.INVENTORY_NAV_CLOSE: {
            this.cleanUp();
            return;
          }
          case CallbackActions.INVENTORY_NAV_NEXT: {
            this.sectionSelectedIndex = ++this.sectionSelectedIndex % INVENTORY_SECTIONS.length;

            break;
          }
          case CallbackActions.INVENTORY_NAV_PREV: {
            this.sectionSelectedIndex--;
            if (this.sectionSelectedIndex < 0) {
              this.sectionSelectedIndex = INVENTORY_SECTIONS.length - 1;
            }

            break;
          }
        }

        const opts: TelegramBot.EditMessageTextOptions = {
          parse_mode: "Markdown",
          chat_id: this.chatId,
          message_id: this.inventoryMessage?.message_id,
          reply_markup: {
            inline_keyboard: this.generateLayout(),
          },
        };

        const msgTxt = this.getHeaderText();
        if (msgTxt !== this.previousMsgText || opts !== this.previousOpts) {
          this.previousMsgText = msgTxt;
          this.previousOpts = opts;
          bot.editMessageText(msgTxt, opts);
        }

        break;
      }
    }
  };

  getHeaderText = (): string => {
    let text = `Inventory of _${this.player?.name}_\n`;
    text += `Section: *${INVENTORY_SECTIONS[this.sectionSelectedIndex]}*`;
    return text;
  };

  cleanUp = () => {
    if (this.inventoryMessage) {
      bot.deleteMessage(this.chatId, this.inventoryMessage?.message_id.toString());
    }

    bot.deleteMessage(this.chatId, this.messageId.toString());

    bot.removeListener("callback_query", this.onCallbackQuery);
  };
}
