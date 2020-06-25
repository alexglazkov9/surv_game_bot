import { IPlayerDocument } from "./players.types";
import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { IWeaponDocument, IWeapon, IArmor } from "../items/items.types";
import { Types } from "mongoose";
import { CallbackActions } from "../../game/misc/CallbackConstants";
import { logger } from "../../utils/logger";
import { Enemy } from "../../game/models/Enemy";
import { CallbackData } from "../../game/models/CallbackData";

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
    let stats_string = `(💚${this.health_points.toFixed(1)})`;
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

export async function recalculateAndSave(this: IPlayerDocument): Promise<void> {
    if (this.health_points <= 0) {
        this.die();
    }

    if (this.experience >= this.getExpCap()) {
        this.levelUp();
    }

    logger.debug(`Saving player in recalculateAndSave()`);
    await this.saveWithRetries();
}

export async function saveWithRetries(this: IPlayerDocument): Promise<void> {
    try {
        logger.debug(`Saving with retries`);
        await this.save();
    } catch (e) {
        logger.debug(`Failed to save, trying again... ${e}`);
        setTimeout(async () => await this.saveWithRetries(), 1000);
    }
}

export async function die(this: IPlayerDocument, save: boolean = false): Promise<void> {
    this.health_points = 0;
    this.action_points /= 2;
    this.experience = 0;
    if (save) {
        await this.saveWithRetries();
    }
    bot.sendMessage(this.chat_id, `${this.name} died like a lil bitch`);
}

export async function levelUp(this: IPlayerDocument, save: boolean = false): Promise<void> {
    while (this.experience >= this.getExpCap()) {
        this.experience -= this.getExpCap();
        this.level++;
        this.health_points_max += 2;
        this.ap_gain_rate += 0.1;
    }
    if (save) {
        logger.debug(`Saving player in levelUp()`);
        await this.saveWithRetries();
    }
}

export async function takeDamage(this: IPlayerDocument, dmg: number): Promise<number> {
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

    await this.recalculateAndSave();

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
                //this.action_points -= (item as IWeapon).ap_cost;
                if ((item as IWeapon).durability <= 0) {
                    this.inventory.splice(index, 1);
                    this.equiped_weapon = null;
                }
            }
        });
    } else {
        //this.action_points--;
    }

    await this.recalculateAndSave();
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
        // if (this.action_points < (equiped_weapon ? equiped_weapon?.ap_cost : 1)) {
        //     let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
        //         callback_query_id: callback_query_id,
        //         text: "Not enough AP",
        //         show_alert: false,
        //     };
        //     bot.answerCallbackQuery(opts_call);
        // } else 
        if (!this.isAlive()) {
            let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                callback_query_id: callback_query_id,
                text: "You are DEAD",
                show_alert: false,
            };
            bot.answerCallbackQuery(opts_call);
        }
    }

    return this.health_points > 0 /*&& this.action_points > (equiped_weapon ? equiped_weapon?.ap_cost : 1)*/;
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

export async function revive(this: IPlayerDocument): Promise<void> {
    this.health_points = this.health_points_max / 2;
    logger.debug(`Saving player in revive()`);
    await this.saveWithRetries();
}

export async function passiveRegen(this: IPlayerDocument, percentage: number): Promise<void> {
    this.health_points += this.health_points_max * (percentage / 100);
    if (this.health_points > this.health_points_max) {
        this.health_points = this.health_points_max;
    }
    logger.debug(`Saving player in passiveRegen()`);
    await this.saveWithRetries();
}

export async function gainAP(this: IPlayerDocument, base_amount: number = 1): Promise<void> {
    this.action_points += this.ap_gain_rate;
    logger.debug(`Saving player in gainAp()`);
    await this.saveWithRetries();
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