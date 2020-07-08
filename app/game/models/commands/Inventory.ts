import TelegramBot = require("node-telegram-bot-api");
import {
  IItemDocument,
  IWeapon,
  IArmor,
  IConsumable,
  IConsumableDocument,
  IWeaponDocument,
} from "../../../database/items/items.types";
import { IPlayerDocument, IPlayer } from "../../../database/players/players.types";
import { bot } from "../../../app";
import { logger } from "../../../utils/logger";
import { CallbackActions } from "../../misc/CallbackConstants";
import { CallbackData } from "../CallbackData";
import { ItemType } from "../../misc/ItemType";
import { PlayerModel } from "../../../database/players/players.model";
import { ArmorTypes } from "../../misc/ArmorTypes";
import { GameParams } from "../../misc/GameParameters";
import { IndicatorsEmojis } from "../../misc/IndicatorsEmojis";

// Number of columns in the inventory
const COL_NUM = 2;
const INVENTORY_SECTIONS = [ItemType.ARMOR, ItemType.WEAPON, ItemType.CONSUMABLE];
const USE_BTN_TXT = "✔️USE✔️";
const EQUIP_BTN_TXT = "✔️EQUIP✔️";
const UNEQUIP_BTN_TXT = "✔️UNEQUIP✔️";
const SELL_BTN_TXT = "💱SELL💱";

export class Inventory {
  character: IPlayerDocument;
  inventoryMessage?: TelegramBot.Message;
  items: IItemDocument[] | undefined;
  sectionSelectedIndex: number;
  previousMsgText?: string;
  previousOpts?: any;

  constructor({ character }: { character: IPlayerDocument }) {
    this.character = character;
    this.sectionSelectedIndex = 0;
  }

  display = async () => {
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
    const itemKeyboard: TelegramBot.InlineKeyboardButton[][] = [];
    const navigationKeyboard: TelegramBot.InlineKeyboardButton[] = [];

    if (this.character !== undefined) {
      // Filter items by ItemType to display in different sections
      const itemsFiltered = this.character.inventory.filter(
        (item) => item.__t === INVENTORY_SECTIONS[this.sectionSelectedIndex]
      );

      let index = 0;
      let row = 0;

      if (itemsFiltered.length !== 0) {
        // Generate listings for items
        for (row = 0; row < itemsFiltered?.length && index < itemsFiltered?.length; row++) {
          for (let k = 0; k < COL_NUM && index < itemsFiltered?.length; k++) {
            if (!itemKeyboard[row]) {
              itemKeyboard[row] = [];
            }

            const item = itemsFiltered[index];
            let equipedItem;
            let btnTxt: string = item.name;

            // Mark equipped items
            if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.WEAPON) {
              equipedItem = this.character.getEquipedWeapon() as IWeaponDocument;

              btnTxt = `${equipedItem?._id.toString() === item._id.toString() ? "✋" : ""} ${
                item.name
              } (${(item as IWeapon).quality})`;
            } else if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.ARMOR) {
              btnTxt = `${item.name} (${(item as IArmor).quality})`;

              // Adds emoji tp indicate equipped items
              if (this.character.isItemEquiped(item._id)) {
                switch ((item as IArmor).type) {
                  case ArmorTypes.HEAD: {
                    btnTxt = `${IndicatorsEmojis.HEAD_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.RINGS: {
                    btnTxt = `${IndicatorsEmojis.RING_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.NECKLACE: {
                    btnTxt = `${IndicatorsEmojis.NECKLACE_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.BODY: {
                    btnTxt = `${IndicatorsEmojis.BODY_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.LEGS: {
                    btnTxt = `${IndicatorsEmojis.LEGS_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.HANDS: {
                    btnTxt = `${IndicatorsEmojis.HANDS_EQUIPPED}${btnTxt}`;
                    break;
                  }
                  case ArmorTypes.FEET: {
                    btnTxt = `${IndicatorsEmojis.FEET_EQUIPPED}${btnTxt}`;
                    break;
                  }
                }
              }
            } else if (INVENTORY_SECTIONS[this.sectionSelectedIndex] === ItemType.CONSUMABLE) {
              btnTxt = `${item.name} (${(item as IConsumable).charges})`;
            }

            const cbData = new CallbackData({
              action: CallbackActions.INVENTORY,
              telegram_id: this.character.telegram_id,
              payload: itemsFiltered[index]._id,
            });
            const cbDataJson = cbData.toJson();
            itemKeyboard[row].push({
              text: btnTxt,
              callback_data: cbDataJson,
            });
            index++;
          }
        }
      } else {
        const emptyCbData = CallbackData.createEmpty();
        itemKeyboard[row] = [
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
      navigationKeyboard.push({
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
      navigationKeyboard.push({
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
      navigationKeyboard.push({
        text: "Next⏩",
        callback_data: data,
      });
    }

    return [navigationKeyboard, ...itemKeyboard];
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
        let inlineKeyboardSellBtn: TelegramBot.InlineKeyboardButton[] = [];

        const itemId = data.payload;

        const useCallbackData = new CallbackData({
          action: CallbackActions.INVENTORY_USE,
          telegram_id: this.character.telegram_id,
          payload: itemId,
        });

        const useBtnData = useCallbackData.toJson();
        inlineKeyboardUseBtn = [
          {
            text: selectedSection === ItemType.CONSUMABLE ? USE_BTN_TXT : EQUIP_BTN_TXT,
            callback_data: useBtnData,
          },
        ];

        if (selectedSection !== ItemType.CONSUMABLE) {
          const sellCallbackData = new CallbackData({
            action: CallbackActions.INVENTORY_SELL,
            telegram_id: this.character.telegram_id,
            payload: itemId,
          });

          const sellBtnData = sellCallbackData.toJson();
          inlineKeyboardSellBtn = [
            {
              text: SELL_BTN_TXT,
              callback_data: sellBtnData,
            },
          ];
        }

        if (this.character) {
          this.character.inventory.forEach(async (item) => {
            if (item._id.toString() === itemId) {
              itemStats = `${(item as IItemDocument).getItemStats({
                showPrice: false,
                showSellPrice: true,
              })}`;
            }
          });
        }

        const opts: TelegramBot.EditMessageTextOptions = {
          message_id: this.inventoryMessage?.message_id,
          chat_id: this.character.private_chat_id,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              inlineKeyboardSellBtn,
              inlineKeyboardUseBtn,
              ...this.generateLayout(),
            ],
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
        // Selected item's id
        const itemId = data.payload;

        switch (selectedSection) {
          case ItemType.WEAPON: {
            if (this.character) {
              this.character.inventory.forEach(async (item) => {
                if (item._id.toString() === itemId) {
                  itemStats = `${(item as IItemDocument).getItemStats({
                    showPrice: false,
                    showSellPrice: true,
                  })}`;
                  if (this.character.equipment.weapon?._id.toString() === item._id.toString()) {
                    if (this.character !== undefined) this.character.equipment.weapon = null;
                  } else {
                    if (this.character !== undefined) {
                      if ((item as IWeapon).min_lvl <= this.character.level) {
                        this.character.equipment.weapon = item._id;
                      } else {
                        const optsLowLevel: TelegramBot.AnswerCallbackQueryOptions = {
                          callback_query_id: callbackQuery.id,
                          show_alert: false,
                          text: "Your level is too low",
                        };
                        bot.answerCallbackQuery(optsLowLevel);
                        return;
                      }
                    }
                  }

                  await (this.character as IPlayerDocument)?.saveWithRetries();
                }
              });
            }
            break;
          }
          case ItemType.ARMOR: {
            this.character.inventory.forEach(async (item) => {
              if (item._id.toString() === itemId) {
                itemStats = `${(item as IItemDocument).getItemStats({
                  showPrice: false,
                  showSellPrice: true,
                })}`;

                const isEquipped = this.character.isItemEquiped(item._id);
                if ((item as IArmor).min_lvl > this.character.level) {
                  const optsLowLevel: TelegramBot.AnswerCallbackQueryOptions = {
                    callback_query_id: callbackQuery.id,
                    show_alert: false,
                    text: "Your level is too low",
                  };
                  bot.answerCallbackQuery(optsLowLevel);
                  return;
                }
                switch ((item as IArmor).type) {
                  case ArmorTypes.HEAD: {
                    this.character.equipment.armor.head = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.RINGS: {
                    this.character.equipment.armor.rings = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.NECKLACE: {
                    this.character.equipment.armor.necklace = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.BODY: {
                    this.character.equipment.armor.body = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.LEGS: {
                    this.character.equipment.armor.legs = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.HANDS: {
                    this.character.equipment.armor.hands = isEquipped ? null : item._id;
                    break;
                  }
                  case ArmorTypes.FEET: {
                    this.character.equipment.armor.feet = isEquipped ? null : item._id;
                    break;
                  }
                }
                await (this.character as IPlayerDocument)?.saveWithRetries();
              }
            });

            break;
          }
          case ItemType.CONSUMABLE: {
            if ((this.character as IPlayerDocument)?.isAlive()) {
              this.character.inventory.forEach(async (item) => {
                if (item._id.toString() === itemId) {
                  itemStats = `${(item as IItemDocument).getItemStats({ showPrice: false })}`;
                  if (this.character) {
                    (item as IConsumableDocument).onConsume(this.character as IPlayerDocument);
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
      // Player clicked SELL
      case CallbackActions.INVENTORY_SELL: {
        // Selected item's id
        const itemId = data.payload;

        const itemSold = this.character.inventory.splice(
          this.character.inventory.findIndex((item) => item._id.toString() === itemId.toString()),
          1
        );

        if (itemSold[0]) {
          switch (itemSold[0].__t) {
            case ItemType.WEAPON: {
              this.character.money +=
                itemSold[0].price *
                GameParams.SELL_PRICE_FACTOR *
                ((itemSold[0] as IWeapon).quality / GameParams.MAX_ITEM_QUALITY);
              break;
            }
            case ItemType.ARMOR: {
              this.character.money +=
                itemSold[0].price *
                GameParams.SELL_PRICE_FACTOR *
                ((itemSold[0] as IArmor).quality / GameParams.MAX_ITEM_QUALITY);
              break;
            }
          }

          this.character.saveWithRetries();
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
    let text = `▶️▶️▶️<b>${section.toUpperCase()}</b>◀️◀️◀️\n\n`;
    text += `${(this.character as IPlayerDocument)?.getShortStats()}\n`;
    return text;
  };

  cleanUp = () => {
    if (this.inventoryMessage) {
      bot.deleteMessage(
        this.character.private_chat_id,
        this.inventoryMessage?.message_id.toString()
      );
    }

    bot.removeListener("callback_query", this.onCallbackQuery);
  };
}
