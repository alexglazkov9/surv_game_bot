import { IPlayerDocument } from "./players.types";
import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { IWeaponDocument, IWeapon, IArmor, IArmorDocument, IItemModel } from "../items/items.types";
import { Types } from "mongoose";
import { ItemType } from "../items/items.model";
import { Enemy } from "../../game/model/Enemy";
import { CallbackData } from "../../game/model/CallbackData";
import { CallbackActions } from "../../game/misc/CallbackConstants";

const DEFAULT_ATTACK_SPEED = 5000;

export function getPlayerStats(this: IPlayerDocument): string {
    let stats_string =
        `*${this.name}* - ${this.level} lvl ${this.health_points <= 0 ? "💀DEAD💀" : ""}\n
     💚HP: ${this.health_points.toFixed(1)}\\${this.health_points_max.toFixed(1)}
     🛡Armor: ${this.armor}\\${this.armor_max}
     ❇Exp: ${this.experience.toFixed(1)}\\${this.getExpCap().toFixed(0)}
     💰Cash: ${this.money.toFixed(2)}
    `;
    return stats_string;
}

export function getShortStats(this: IPlayerDocument): string {
    let stats_string = `(💚${this.health_points.toFixed(1)}⚡️${this.action_points.toFixed(1)})`;
    return stats_string;
}

export function getPlayerInventory(this: IPlayerDocument) {

}

export async function sendPlayerStats(this: IPlayerDocument, message_id: number, caller_t_id: number | undefined = undefined): Promise<void> {
    let inline_keyboard_nav: TelegramBot.InlineKeyboardButton[] = [];
    let callback_data = new CallbackData({ action: CallbackActions.PLAYER_STATS_NAV, telegram_id: caller_t_id ?? this.telegram_id, payload: CallbackActions.PLAYERS_STATS_CLOSE });
    let data = callback_data.toJson();
    inline_keyboard_nav.push({
        text: "❌CLOSE",
        callback_data: data
    });
    let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    inline_keyboard.push(inline_keyboard_nav);
    let opts: TelegramBot.SendMessageOptions = {
        reply_to_message_id: message_id,
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: inline_keyboard,
        },
    }
    let message_sent = await bot.sendMessage(this.chat_id, this.getPlayerStats(), opts);
    const onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        if (message_sent.message_id != callbackQuery.message?.message_id) {
            return;
        }
        const action = callbackQuery.data ?? ' ';
        const sender_id = callbackQuery.from.id;

        if (action[0] === '{') {
            const data = CallbackData.fromJson(action);
            if (data.telegram_id === sender_id && data.action == CallbackActions.PLAYER_STATS_NAV) {
                if (data.payload === CallbackActions.PLAYERS_STATS_CLOSE) {
                    bot.deleteMessage(callbackQuery.message.chat.id, message_id.toString());
                    bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id.toString());
                    bot.removeListener('callback_query', onCallbackQuery);
                }
            }
        }
    }

    bot.on('callback_query', onCallbackQuery);
    return Promise.resolve();
}

//Generate inventory for <item_type>
export function generateInventoryLayout(this: IPlayerDocument, item_type: ItemType): TelegramBot.InlineKeyboardButton[][] {
    let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];
    let num_of_cols: number = 2;

    let items_filtered = this.inventory.filter((item) => item.__t == item_type);

    if (items_filtered.length > 0) {
        let index = 0;
        for (let k = 0; k < items_filtered.length && index < items_filtered.length; k++) {
            let row: TelegramBot.InlineKeyboardButton[] = [];
            for (let i = 0; i < num_of_cols && index < items_filtered.length; i++) {
                let callback_data = new CallbackData({ action: CallbackActions.INVENTORY, telegram_id: this.telegram_id, payload: items_filtered[index]._id });
                let data = callback_data.toJson();
                let item = items_filtered[index++];
                let equiped_item;
                let btn_txt = '';
                if (item_type == ItemType.WEAPON) {
                    equiped_item = this.equiped_weapon;
                    btn_txt = `${equiped_item?._id.toString() == item._id.toString() ? "🟢" : ""} ${item.name} (${(item as IWeapon).durability})`;
                } else if (item_type == ItemType.ARMOR) {
                    equiped_item = this.equiped_armor;
                    btn_txt = `${equiped_item?._id.toString() == item._id.toString() ? "🟢" : ""} ${item.name} (${(item as IArmor).durability})`;
                }
                row.push({
                    text: btn_txt,
                    callback_data: data
                });
            }
            inline_keyboard.push(row);
        }
    } else {
        inline_keyboard[0] = [{
            text: `SO EMPTY... WOW`,
            callback_data: "ignore"
        }]
    }

    let inline_keyboard_nav: TelegramBot.InlineKeyboardButton[] = [];
    let callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.telegram_id, payload: CallbackActions.INVENTORY_NAV_PREV });
    let data = callback_data.toJson();
    inline_keyboard_nav.push({
        text: "⏪Prev",
        callback_data: data
    });
    callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.telegram_id, payload: CallbackActions.INVENTORY_NAV_CLOSE });
    data = callback_data.toJson();
    inline_keyboard_nav.push({
        text: "❌CLOSE",
        callback_data: data
    });
    callback_data = new CallbackData({ action: CallbackActions.INVENTORY_NAV, telegram_id: this.telegram_id, payload: CallbackActions.INVENTORY_NAV_NEXT });
    data = callback_data.toJson();
    inline_keyboard_nav.push({
        text: "Next⏩",
        callback_data: data
    });

    return [inline_keyboard_nav, ...inline_keyboard];
}

export async function sendInventory(this: IPlayerDocument, message_id: number) {
    let sections = [ItemType.ARMOR, ItemType.WEAPON];
    let selected_index = 0;
    let inline_keyboard = this.generateInventoryLayout(sections[selected_index]);

    let opts_send: TelegramBot.SendMessageOptions = {
        parse_mode: "Markdown",
        reply_markup: {
            inline_keyboard: inline_keyboard,
        },
    };

    let inv_title = `${this.name}'s inverntory\n`;
    let section_title = `*${sections[selected_index]}*`;
    let message_id_sent = (await bot.sendMessage(this.chat_id, inv_title + section_title, opts_send)).message_id;

    const onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        if (message_id_sent != callbackQuery.message?.message_id) {
            return;
        }
        const action = callbackQuery.data ?? ' ';
        const sender_id = callbackQuery.from.id;

        if (action[0] === '{') {
            const data = CallbackData.fromJson(action);
            if (data.telegram_id === sender_id) {
                let opts_edit: TelegramBot.EditMessageTextOptions = {};

                switch (data.action) {
                    case CallbackActions.INVENTORY: {
                        if (sections[selected_index] == ItemType.WEAPON) {
                            this.inventory.forEach((item) => {
                                if (item._id == data.payload) {
                                    if (this.equiped_weapon?.toString() == item._id.toString()) {
                                        this.equiped_weapon = null;
                                    } else {
                                        this.equiped_weapon = item._id;
                                    }
                                    this.save();
                                }
                            });
                        } else if (sections[selected_index] == ItemType.ARMOR) {
                            this.inventory.forEach((item) => {
                                if (item._id == data.payload) {
                                    if (this.equiped_armor?.toString() == item._id.toString()) {
                                        this.equiped_armor = null;
                                    } else {
                                        this.equiped_armor = item._id;
                                    }
                                    this.save();
                                }
                            });
                        }

                        let inline_keyboard = this.generateInventoryLayout(sections[selected_index]);

                        opts_edit = {
                            parse_mode: "Markdown",
                            chat_id: this.chat_id,
                            message_id: callbackQuery.message?.message_id,
                            reply_markup: {
                                inline_keyboard: inline_keyboard,
                            },
                        };

                        break;
                    }
                    case CallbackActions.INVENTORY_NAV: {
                        if (data.payload === CallbackActions.INVENTORY_NAV_NEXT) {
                            selected_index = ++selected_index % sections.length;
                        } else if (data.payload === CallbackActions.INVENTORY_NAV_PREV) {
                            selected_index--;
                            if (selected_index < 0) {
                                selected_index = sections.length - 1;
                            }
                        }

                        let inline_keyboard = this.generateInventoryLayout(sections[selected_index]);

                        opts_edit = {
                            parse_mode: "Markdown",
                            chat_id: this.chat_id,
                            message_id: callbackQuery.message?.message_id,
                            reply_markup: {
                                inline_keyboard: inline_keyboard,
                            },
                        };

                        if (data.payload === CallbackActions.INVENTORY_NAV_CLOSE) {
                            bot.deleteMessage(callbackQuery.message.chat.id, callbackQuery.message.message_id.toString());
                            bot.deleteMessage(callbackQuery.message.chat.id, message_id.toString());
                            bot.removeListener('callback_query', onCallbackQuery);
                        }
                        break;
                    }
                }
                section_title = `*${sections[selected_index]}*`;
                bot.editMessageText(inv_title + section_title, opts_edit);
            }
        }
    }

    bot.on('callback_query', onCallbackQuery);
}

export function recalculateAndSave(this: IPlayerDocument): void {
    if (this.health_points <= 0) {
        this.die();
    }

    if (this.experience >= this.getExpCap()) {
        this.levelUp();
    }

    this.save();
}

export function die(this: IPlayerDocument, save: boolean = false): void {
    this.health_points = 0;
    this.action_points /= 2;
    this.experience = 0;
    if (save) {
        this.save();
    }
    bot.sendMessage(this.chat_id, `${this.name} died like a lil bitch`);
}

export function levelUp(this: IPlayerDocument, save: boolean = false): void {
    while (this.experience >= this.getExpCap()) {
        this.experience -= this.getExpCap();
        this.level++;
        this.health_points_max += 2;
        this.ap_gain_rate += 0.1;
    }
    if (save) {
        this.save();
    }
}

export function takeDamage(this: IPlayerDocument, dmg: number): number {
    //Armor damage reduction
    if (this.equiped_armor != null) {
        this.inventory.find((item, index) => {
            if (item._id.toString() == this.equiped_armor?.toString()) {
                let armor = item as IArmor;
                dmg = dmg - armor.armor;
                if (dmg < 0) {
                    dmg = 0;
                }
                armor.durability--;
                if (armor.durability <= 0) {
                    this.inventory.splice(index, 1);
                    this.equiped_armor = null;
                }
                return true;
            }
            return false;
        });
    }

    this.health_points -= dmg;

    this.recalculateAndSave();

    return dmg;
}

export function getExpCap(this: IPlayerDocument): number {
    return (this.level * 2) + 10 - 2;
}

export function getHitDamage(this: IPlayerDocument): number {
    var dmg = 1;
    let weapon = this.getEquipedWeapon();
    if (weapon != null) {
        dmg = (weapon as IWeaponDocument).damage;
    }
    return dmg;
}

export async function hitEnemy(this: IPlayerDocument, enemy: Enemy): Promise<void> {
    enemy.takeDamage(this);

    if (this.equiped_weapon != null) {
        this.inventory.forEach((item, index) => {
            if (item._id.toString() === this.equiped_weapon?._id.toString()) {
                (item as IWeapon).durability--;
                this.action_points -= (item as IWeapon).ap_cost;
                if ((item as IWeapon).durability <= 0) {
                    this.inventory.splice(index, 1);
                    this.equiped_weapon = null;
                }
            }
        });
    } else {
        this.action_points--;
    }

    this.recalculateAndSave();
}

export async function addItemToInventory(this: IPlayerDocument, item_name: string) {
    let item = await db?.ItemModel.findOne({ name: item_name });
    if (item) {
        item._id = Types.ObjectId();
        item.isNew = true;
        this.inventory.push(item);
    }
}

export function canAttack(this: IPlayerDocument, callback_query_id: string | null = null): boolean {
    let equiped_weapon = this.getEquipedWeapon();
    if (callback_query_id) {
        if (this.action_points < (equiped_weapon ? equiped_weapon?.ap_cost : 1)) {
            let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                callback_query_id: callback_query_id,
                text: "Not enough AP",
                show_alert: false,
            };
            bot.answerCallbackQuery(opts_call);
        } else if (!this.isAlive()) {
            let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                callback_query_id: callback_query_id,
                text: "You are DEAD",
                show_alert: false,
            };
            bot.answerCallbackQuery(opts_call);
        }
    }

    return this.health_points > 0 && this.action_points > (equiped_weapon ? equiped_weapon?.ap_cost : 1);
}

export function getAttackSpeed(this: IPlayerDocument): number {
    let equiped_weapon = this.getEquipedWeapon();
    if (equiped_weapon) {
        return equiped_weapon.attack_speed;
    } else {
        return DEFAULT_ATTACK_SPEED;
    }
}

export function isAlive(this: IPlayerDocument): boolean {
    return this.health_points > 0;
}

export function revive(this: IPlayerDocument): void {
    this.health_points = this.health_points_max / 2;
    this.save();
}

export function passiveRegen(this: IPlayerDocument, percentage: number): void {
    this.health_points += this.health_points_max * (percentage / 100);
    if (this.health_points > this.health_points_max) {
        this.health_points = this.health_points_max;
    }
    this.save();
}

export function gainAP(this: IPlayerDocument, base_amount: number = 1): void {
    this.action_points += this.ap_gain_rate;
    this.save();
}

export function gainXP(this: IPlayerDocument, amount: number): void {
    this.experience += amount;
    this.levelUp(false);
}

export function getEquipedWeapon(this: IPlayerDocument): IWeapon | null {
    if (this.equiped_weapon) {
        let weapon = this.inventory.find((item) => { return item._id.toString() == this.equiped_weapon?.toString(); });
        return weapon as IWeapon;
    }
    return null;
}