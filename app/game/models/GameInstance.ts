import TelegramBot = require("node-telegram-bot-api");
import { Enemy } from "./units/Enemy";
import { logger } from "../../utils/logger";

import enemies = require("../../database/enemies/enemies.json");
import { getRandomInt, sleep } from "../../utils/utils";
import { NPCBattle } from "./battle/battleground/NPCBattle";
import { BattleEvents } from "./battle/BattleEvents";
import { BattleGround } from "./battle/battleground/BattleGround";
import { IUnit } from "./units/IUnit";
import { Duel } from "./battle/battleground/Duel";
import { CharacterPool } from "./CharacterPool";
import { GameParams } from "../misc/GameParameters";
import { Character } from "./units/Character";
import { engine } from "../../app";

const RESPAWN_RATE = 60 * 60 * 1000;
const HP_REGEN_RATE = 1 * 60 * 1000;
const HP_REGEN_PERCENTAGE = 10;

export class GameInstance {
  private chatId: number;
  private bot: TelegramBot;
  private battleInProgress?: BattleGround;
  private spawnProbabilities: number[];

  constructor({ chat_id, bot }: { chat_id: number; bot: TelegramBot }) {
    this.chatId = chat_id;
    this.bot = bot;

    this.spawnProbabilities = [];
    this.generateSpawnProbabilities();
  }

  start = async () => {
    this.startSpawning();
    this.startHpRegen();
    this.startRevivingPlayers();
  };

  startDuel = async (host: IUnit, wager: number) => {
    const duel = new Duel({
      chatId: this.chatId,
      bot: this.bot,
      engine,
      prizeMoney: wager,
    });

    duel.addToTeamHost(host);

    duel.initBattle();
    duel.addListener(BattleEvents.BATTLE_ENDED, () => {
      this.battleInProgress = undefined;
    });
    this.battleInProgress = duel;
  };

  startSpawning = async () => {
    this.battleInProgress = undefined;
    const msecs = getRandomInt(5, 30) * 60 * 1000;
    logger.verbose(`Start spawning in ${this.chatId} in ${msecs / 1000} seconds`);
    await sleep(msecs);
    this.spawnEnemy();
  };

  spawnEnemy = async (onlyOne: boolean = false) => {
    const enemy = await this.getRandomEnemy();
    // const enemy2 = await this.getRandomEnemy(enemy.level);

    const battle = new NPCBattle({ chatId: this.chatId, bot: this.bot, engine });

    battle.addListener(BattleEvents.BATTLE_ENDED, () => {
      if (!onlyOne) {
        this.startSpawning();
      }
      this.battleInProgress = undefined;
    });

    battle.addToTeamHost(enemy);
    engine.Add(enemy);
    // battle.addToTeamHost(enemy2);

    // 10% chance to instantly start fighting someone
    if (getRandomInt(0, 100) >= 90) {
      let character;
      // Makes sure enemy attacks player of the same level
      do {
        const characters = CharacterPool.getInstance().getAllFromChat({ chatId: this.chatId });
        character = characters[getRandomInt(0, characters.length)];
      } while (Math.abs(character.level - enemy.level) > GameParams.ALLOWED_LEVEL_DIFFERENCE);

      battle.addToTeamGuest(character);
      battle.startFight();
    }

    while (this.isBattleInProgress()) {
      logger.debug("Battle is in progress. Waiting turn...");
      await sleep(5000);
    }

    logger.debug("Starting battle now");
    battle.initBattle();
    this.battleInProgress = battle;
    logger.verbose(`Spawning enemy [${enemy.name}] in ${this.chatId}`);
  };

  getRandomEnemy = async (enemyLevel?: number): Promise<Enemy> => {
    if (enemyLevel === undefined) {
      enemyLevel = CharacterPool.getInstance().getRandomLevel({ chatId: this.chatId });
    }

    // Randomly picks enemy type to spawn, repicks if lvl requirements are out of bounds
    let enemyType;
    do {
      enemyType = this.getRandomEnemyType();
    } while (enemies[enemyType].min_lvl > enemyLevel || enemies[enemyType].max_lvl < enemyLevel);

    return Enemy.fromJson({
      bot: this.bot,
      json: enemies[enemyType],
      chat_id: this.chatId,
      level: enemyLevel,
    });
  };

  getRandomEnemyType = (): number => {
    const spawnProbability = getRandomInt(0, 100);
    let enemyType = 0;
    while (this.spawnProbabilities[enemyType] <= spawnProbability) {
      enemyType++;
    }

    return enemyType;
  };

  // Generates table with spawn probabilities for different types of mobs
  generateSpawnProbabilities = () => {
    let prevProbability = 0;
    enemies.forEach((enemy) => {
      this.spawnProbabilities.push(prevProbability + enemy.spawn_chance);
      prevProbability += enemy.spawn_chance;
    });
  };

  startRevivingPlayers = async () => {
    while (true) {
      await sleep(RESPAWN_RATE);
      this.reviveAllPlayers();
    }
  };

  reviveAllPlayers = async () => {
    const players = CharacterPool.getInstance().getAllFromChat({
      chatId: this.chatId,
      alive: false,
    });
    players?.forEach((player) => {
      player._doc.revive();
    });

    this.bot.sendMessage(this.chatId, `👼🏿All players have been respawned.`, {
      disable_notification: true,
    });
  };

  startHpRegen = async () => {
    while (true) {
      await sleep(HP_REGEN_RATE);
      this.regenHpToAllPlayers();
    }
  };

  regenHpToAllPlayers = async () => {
    const players = CharacterPool.getInstance().getAllFromChat({
      chatId: this.chatId,
      alive: true,
    });
    players?.forEach((player) => {
      player._doc.passiveRegen(HP_REGEN_PERCENTAGE);
    });
  };

  isBattleInProgress(): boolean {
    return this.battleInProgress !== undefined;
  }
}
