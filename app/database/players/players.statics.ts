import { IPlayerDocument, IPlayerModel } from "./players.types";
import { PlayerModel } from "./players.model";

export async function findPlayer(
    this: IPlayerModel, {
        telegram_id,
        chat_id,
    }: { telegram_id: number, chat_id: number }
): Promise<IPlayerDocument | null> {
    const player = await this.findOne({ telegram_id, chat_id });
    return player ?? null;
}

export async function createNewPlayer(
    this: IPlayerModel,
    {
        telegram_id,
        chat_id,
        name,
    }: {
        telegram_id: number | undefined,
        chat_id: number | undefined,
        name: string,
    }
): Promise<IPlayerDocument> {
    let player = new PlayerModel({ telegram_id, chat_id });
    player.name = name;
    player = await this.create(player);
    return player;
}

export async function playerExists(
    this: IPlayerModel,
    {
        telegram_id,
        chat_id,
    }: { telegram_id: number | undefined, chat_id: number | undefined, }
): Promise<boolean> {
    const exists = await this.exists({ telegram_id, chat_id });
    return exists;
}

export async function getRandomPlayer(
    this: IPlayerModel,
    chat_id: number,
    alive?: boolean
): Promise<IPlayerDocument | null> {
    let playersInChat: IPlayerDocument[];
    if (alive) {
        playersInChat = await this.find({ chat_id, health_points: { $gt: 0 } });
    } else {
        playersInChat = await this.find({ chat_id });;
    }

    if (playersInChat.length === 0) {
        return null;
    }
    const player = playersInChat[getRandomInt(playersInChat.length)];
    return player;
}

export async function isNameTaken(
    this: IPlayerModel,
    name: string
): Promise<boolean> {
    const record = await this.findOne({ name });
    if (record) {
        return true;;
    } else {
        return false;
    }
}

export async function getAllFromChat(
    this: IPlayerModel,
    chat_id: number,
    alive?: boolean,
): Promise<IPlayerDocument[]> {
    let playersInChat: IPlayerDocument[];
    if (alive) {
        playersInChat = await this.find({ chat_id, health_points: { $gt: 0 } });
    } else {
        playersInChat = await this.find({ chat_id, health_points: { $lte: 0 } });;
    }
    return playersInChat;
}

export async function getAll(
    this: IPlayerModel,
    alive?: boolean,
): Promise<IPlayerDocument[]> {
    let playersInChat: IPlayerDocument[];
    if (alive) {
        playersInChat = await this.find({ health_points: { $gt: 0 } });
    } else {
        playersInChat = await this.find({ health_points: { $lte: 0 } });;
    }
    return playersInChat;
}

function getRandomInt(max: number): number {
    return Math.floor(Math.random() * Math.floor(max));
}
