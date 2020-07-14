import { IPlayerDocument } from "../../database/players/players.types";
import { PlayerModel } from "../../database/players/players.model";
import { logger } from "../../utils/logger";
import { getRandomInt } from "../../utils/utils";

export class CharacterPool {
  private static instance: CharacterPool;
  private characters: IPlayerDocument[];

  private constructor() {
    this.characters = [];
  }

  public static getInstance(): CharacterPool {
    if (!CharacterPool.instance) {
      CharacterPool.instance = new CharacterPool();
    }

    return CharacterPool.instance;
  }

  // Pulls all character from the database
  public async init() {
    logger.info("Initializing CharacterPool...");
    try {
      this.characters = await PlayerModel.find();
    } catch (err) {
      logger.error(`CharacterlPool initialization failed: ${err}`);
    }
  }

  public get({ telegramId }: { telegramId: number | undefined }) {
    return this.characters.filter((chrctr) => chrctr.telegram_id === telegramId);
  }

  public getOne({
    chatId,
    telegramId,
  }: {
    chatId: number;
    telegramId: number | undefined;
  }): IPlayerDocument | undefined {
    return this.characters.find(
      (chrctr) => chrctr.telegram_id === telegramId && chrctr.chat_id === chatId
    );
  }

  public getAllFromChat({ chatId, alive = true }: { chatId: number; alive?: boolean }) {
    return this.characters.filter(
      (chrctr) => chrctr.chat_id === chatId && chrctr.isAlive() === alive
    );
  }

  public getByName({ name }: { name: string }) {
    return this.characters.find((chrctr) => chrctr.name === name);
  }

  public exists({ telegramId, chatId }: { telegramId: number | undefined; chatId: number }) {
    return (
      this.characters.find(
        (chrctr) => chrctr.telegram_id === telegramId && chrctr.chat_id === chatId
      ) !== undefined
    );
  }

  public isNameTaken({ name }: { name: string }) {
    return this.characters.find((chrctr) => chrctr.name === name) !== undefined;
  }

  public async create({
    telegramId,
    chatId,
    name,
  }: {
    telegramId: number;
    chatId: number;
    name: string;
  }) {
    const character = await PlayerModel.createNewPlayer({
      telegram_id: telegramId,
      chat_id: chatId,
      name,
    });

    this.characters.push(character);
    return character;
  }

  public getRandomLevel({ chatId }: { chatId: number }) {
    let playersInChat: IPlayerDocument[];
    playersInChat = this.getAllFromChat({ chatId });
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;
    playersInChat.forEach((player) => {
      if (player.level < min) {
        min = player.level;
      }
      if (player.level > max) {
        max = player.level;
      }
    });

    let rndLvl: number;
    do {
      rndLvl = getRandomInt(min, max + 2);
    } while (
      !playersInChat.some((player) => {
        return Math.abs(rndLvl - player.level) <= 5;
      })
    );

    return rndLvl;
  }
}
