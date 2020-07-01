import TelegramBot = require("node-telegram-bot-api");
import {
  IItemDocument,
  IWeapon,
  IArmor,
  IConsumable,
  IConsumableDocument,
} from "../../../database/items/items.types";
import { IPlayerDocument, IPlayer } from "../../../database/players/players.types";
import { bot } from "../../../app";
import { logger } from "../../../utils/logger";
import { CallbackActions } from "../../misc/CallbackConstants";
import { CallbackData } from "../CallbackData";
import { ItemType } from "../../misc/ItemType";
import { PlayerModel } from "../../../database/players/players.model";

// Number of columns in the inventory
const COL_NUM = 2;
const INVENTORY_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON, ItemType.CONSUMABLE];
const USE_BTN_TXT = "USE";
const EQUIP_BTN_TXT = "EQUIP";

export class Inventory {
  character: IPlayer;
  // chatId: number;
  // fromId: number;
  // messageId: number;
  inventoryMessage?: TelegramBot.Message;
  items: IItemDocument[] | undefined;
  player: IPlayerDocument | undefined;
  sectionSelectedIndex: number;
  previousMsgText?: string;
  previousOpts?: any;

  constructor({ character }: { character: IPlayer }) {
    this.character = character;
    // this.chatId = chat_id;
    // this.fromId = from_id;
    // this.messageId = message_id;
    this.sectionSelectedIndex = 0;
  }

  pullPlayer = async () => {
    // Pull all items to be displayed in the shop
    try {
      this.player = await PlayerModel.findPlayer({
        telegram_id: this.character.telegram_id,
        chat_id: this.character.chat_id,
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
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: this.generateLayout(),
      },
      disable_notification: true,
    };

    this.inventoryMessage = await bot.sendMessage(
      this.character.private_chat_id,
      this.getHeaderText(),
      opts
    );
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
            let btnTxt: string = item.name;

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
            } else if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.CONSUMABLE) {
              btnTxt = `${item.name} (${(item as IConsumable).charges})`;
            }

            const cbData = new CallbackData({
              action: CallbackActions.INVENTORY,
              telegram_id: this.character.telegram_id,
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
        telegram_id: this.character.telegram_id,
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
        telegram_id: this.character.telegram_id,
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
        telegram_id: this.character.telegram_id,
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

    const selectedSection = INVENTORY_SECTIONS[this.sectionSelectedIndex];
    let itemStats: string = "";
    switch (data.action) {
      // Player clicked on any item
      case CallbackActions.INVENTORY: {
        let inlineKeyboardUseBtn: TelegramBot.InlineKeyboardButton[] = [];

        const itemId = data.payload;

        const callbackData = new CallbackData({
          action: CallbackActions.INVENTORY_USE,
          telegram_id: this.character.telegram_id,
          payload: itemId,
        });

        const useBtnData = callbackData.toJson();
        inlineKeyboardUseBtn = [
          {
            text: selectedSection === ItemType.CONSUMABLE ? USE_BTN_TXT : EQUIP_BTN_TXT,
            callback_data: useBtnData,
          },
        ];

        if (this.player) {
          this.player.inventory.forEach(async (item) => {
            if (item._id.toString() === itemId) {
              itemStats = `${(item as IItemDocument).getItemStats({ showPrice: false })}`;
            }
          });
        }

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.inventoryMessage?.message_id,
          chat_id: this.character.private_chat_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [inlineKeyboardUseBtn, ...this.generateLayout()],
          },
        };

        const msgTxt = this.getHeaderText() + `\n${itemStats}`;
        if (msgTxt !== this.previousMsgText || opts !== this.previousOpts) {
          this.previousMsgText = msgTxt;
          this.previousOpts = opts;
          bot.editMessageText(msgTxt, opts);
        }

        break;
      }
      // Player clicked USE/EQUIP
      case CallbackActions.INVENTORY_USE: {
        const itemId = data.payload;

        switch (selectedSection) {
          case ItemType.WEAPON: {
            if (this.player) {
              this.player.inventory.forEach(async (item) => {
                if (item._id.toString() === itemId) {
                  itemStats = `${(item as IItemDocument).getItemStats({ showPrice: false })}`;
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
                if (item._id.toString() === itemId) {
                  itemStats = `${(item as IItemDocument).getItemStats({ showPrice: false })}`;
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
          case ItemType.CONSUMABLE: {
            if (this.player?.isAlive()) {
              this.player.inventory.forEach(async (item) => {
                if (item._id.toString() === itemId) {
                  itemStats = `${(item as IItemDocument).getItemStats({ showPrice: false })}`;
                  if (this.player) {
                    (item as IConsumableDocument).onConsume(this.player);
                  }
                }
              });
            } else {
              const optsCall = {
                callback_query_id: callbackQuery.id,
                text: "You are DEAD",
                show_alert: false,
              };
              bot.answerCallbackQuery(optsCall);
            }
            break;
          }
        }

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.inventoryMessage?.message_id,
          chat_id: this.character.private_chat_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: this.generateLayout(),
          },
        };

        const msgTxt = this.getHeaderText() + `\n${itemStats}`;
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
          parse_mode: "HTML",
          chat_id: this.character.private_chat_id,
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
    const section = INVENTORY_SECTIONS[this.sectionSelectedIndex];
    let text = `<pre>    </pre>▶️<b>${section.toUpperCase()}</b>◀️\n\n`;
    text += `${this.player?.getShortStats()}\n`;
    return text;
  };

  cleanUp = () => {
    if (this.inventoryMessage) {
      bot.deleteMessage(
        this.character.private_chat_id,
        this.inventoryMessage?.message_id.toString()
      );
    }

    //bot.deleteMessage(this.chatId, this.messageId.toString());

    bot.removeListener("callback_query", this.onCallbackQuery);
  };
}
