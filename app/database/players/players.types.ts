import { Document, Model } from "mongoose";
import { Enemy } from "../../game/model/Enemy";
import { IItem } from "../items/items.types";

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
    money: number,
    inventory: Array<IItem>,
}

export interface IPlayerDocument extends IPlayer, Document {
    getPlayerStats: (this: IPlayerDocument) => string;
    recalculateAndSave: (this: IPlayerDocument) => void;
    getExpCap: (this: IPlayerDocument) => number;
    getHitDamage: (this: IPlayerDocument) => number;
    takeDamage: (this: IPlayerDocument, dmg: number) => void;
    canAttack: (this: IPlayerDocument) => boolean;
    revive: (this: IPlayerDocument) => void;
    passiveRegen: (this: IPlayerDocument, percentage: number) => void;
    gainAP: (this: IPlayerDocument, base_amount?: number) => void;
    hitEnemy: (this: IPlayerDocument, enemy: Enemy) => void;
    die: (this: IPlayerDocument) => void;
    levelUp: (this: IPlayerDocument) => void;
}

export interface IPlayerModel extends Model<IPlayerDocument> {
    findPlayer: (
        this: IPlayerModel,
        {
            telegram_id,
            chat_id,
        }: { telegram_id: number | undefined, chat_id: number | undefined }
    ) => Promise<IPlayerDocument>;

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
}