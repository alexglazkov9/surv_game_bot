import { Document, Model } from "mongoose";
import { IItem, IWeapon } from "../items/items.types";
import TelegramBot = require("node-telegram-bot-api");
import { ItemType } from "../items/items.model";
import { Enemy } from "../../game/model/Enemy";

export interface IPlayer {
    telegram_id: number,
    chat_id: number
    name: string,
    health_points_max: number,
    health_points: number,
    armor_max: number,
    armor: number,
    level: number,
    experience: number,
    action_points: number,
    ap_gain_rate: number,
    money: number,
    inventory: Array<IItem>,
    equiped_armor: IItem | null,
    equiped_weapon: IItem | null,
}

export interface IPlayerDocument extends IPlayer, Document {
    getPlayerStats: (this: IPlayerDocument) => string;
    getShortStats: (this: IPlayerDocument) => string;
    recalculateAndSave: (this: IPlayerDocument) => void;
    getExpCap: (this: IPlayerDocument) => number;
    getHitDamage: (this: IPlayerDocument) => number;
    takeDamage: (this: IPlayerDocument, dmg: number) => number;
    canAttack: (this: IPlayerDocument, callback_query_id?: string) => boolean;
    isAlive: (this: IPlayerDocument) => boolean;
    revive: (this: IPlayerDocument) => void;
    passiveRegen: (this: IPlayerDocument, percentage: number) => void;
    gainAP: (this: IPlayerDocument, base_amount?: number) => void;
    hitEnemy: (this: IPlayerDocument, enemy: Enemy) => Promise<void>;
    die: (this: IPlayerDocument, save?: boolean) => void;
    levelUp: (this: IPlayerDocument, save?: boolean) => void;
    sendPlayerStats: (this: IPlayerDocument, message_id: number, caller_t_id?: number) => Promise<void>;
    sendInventory: (this: IPlayerDocument, message_id: number) => void;
    generateInventoryLayout: (this: IPlayerDocument, item_type: ItemType) => TelegramBot.InlineKeyboardButton[][];
    getEquipedWeapon: (this: IPlayerDocument) => IWeapon | null;
    getAttackSpeed: (this: IPlayerDocument) => number;
    addItemToInventory: (this: IPlayerDocument, item_name: string) => Promise<void>;
    gainXP: (this: IPlayerDocument, amount: number) => void;
}

export interface IPlayerModel extends Model<IPlayerDocument> {
    findPlayer: (
        this: IPlayerModel,
        {
            telegram_id,
            chat_id,
        }: { telegram_id: number | undefined, chat_id: number | undefined }
    ) => Promise<IPlayerDocument>;

    findPlayerByName: (
        this: IPlayerModel, {
            name,
            chat_id,
        }: { name: string, chat_id: number }
    ) => Promise<IPlayerDocument | null>;

    createNewPlayer: (
        this: IPlayerModel,
        {
            telegram_id,
            chat_id,
            name
        }: { telegram_id: number | undefined, chat_id: number | undefined, name: string }
    ) => Promise<IPlayerDocument>;

    playerExists: (
        this: IPlayerModel,
        {
            telegram_id,
            chat_id,
        }: { telegram_id: number | undefined, chat_id: number | undefined }
    ) => Promise<boolean>;

    getRandomPlayer: (
        this: IPlayerModel,
        chat_id: number,
        alive?: boolean
    ) => Promise<IPlayerDocument>;

    isNameTaken: (
        this: IPlayerModel,
        name: string,
    ) => Promise<boolean>;

    getAllFromChat: (
        this: IPlayerModel,
        chat_id: number,
        alive?: boolean,
    ) => Promise<IPlayerDocument[]>;

    getAll: (
        this: IPlayerModel,
        alive?: boolean,
    ) => Promise<IPlayerDocument[]>;

    getRandomMinMaxLvl: (
        this: IPlayerModel,
        chat_id: number
    ) => Promise<number>;
}