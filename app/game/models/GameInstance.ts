import TelegramBot = require("node-telegram-bot-api");
import { PlayerModel } from "../../database/players/players.model";
import { Enemy, ON_DEATH_EVENT } from "./Enemy";
import { logger } from "../../utils/logger";

import enemies = require("../../database/enemies/enemies.json");
import { getRandomInt, sleep } from "../../utils/utils";

const RESPAWN_RATE = 60 * 60 * 1000;
const HP_REGEN_RATE = 60 * 60 * 1000;
const HP_REGEN_PERCENTAGE = 10;

export class GameInstance {
  private chatId: number;
  private bot: TelegramBot;
  private spawnProbabilities: number[];

  constructor({ chat_id, bot }: { chat_id: number; bot: TelegramBot }) {
    this.chatId = chat_id;
    this.bot = bot;

    this.spawnProbabilities = [];
    this.generateSpawnProbabilities();
  }

  start = () => {
    this.startSpawning();
    this.startHpRegen();
    this.startRevivingPlayers();
  };

  startSpawning = async () => {
    const msecs = getRandomInt(15, 60) * 60 * 1000;
    logger.verbose(`Start spawning in ${this.chatId} in ${msecs / 1000} seconds`);
    await sleep(msecs);
    this.spawnEnemy();
  };

  spawnEnemy = async () => {
    const enemy = await this.getRandomEnemy();
    logger.verbose(`Spawning enemy [${enemy.name}] in ${this.chatId}`);
    enemy.spawn();
    enemy.addListener(ON_DEATH_EVENT, this.startSpawning);
  };

  getRandomEnemy = async (): Promise<Enemy> => {
    const enemyLevel = (await PlayerModel.getRandomMinMaxLvl(this.chatId)) ?? 1;

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
    // if (this.respawn_timer === undefined) {
    //   clearInterval(this.respawn_timer);
    //   this.respawn_timer = undefined;
    // }
    // this.respawn_timer = setInterval(this.reviveAllPlayers, this.respawn_rate);
    while (true) {
      await sleep(RESPAWN_RATE);
      this.reviveAllPlayers();
    }
  };

  reviveAllPlayers = async () => {
    const players = await PlayerModel.getAllFromChat(this.chatId, false);
    players?.forEach((player) => {
      player.revive();
    });

    this.bot.sendMessage(this.chatId, `👼🏿All players have been respawned.`, {
      disable_notification: true,
    });
  };

  startHpRegen = async () => {
    // if (this.hp_regen_timer == undefined) {
    //   clearInterval(this.hp_regen_timer);
    //   this.hp_regen_timer = undefined;
    // }
    // this.hp_regen_timer = setInterval(this.regenHpToAllPlayers, this.hp_regen_rate);
    while (true) {
      await sleep(HP_REGEN_RATE);
      this.regenHpToAllPlayers();
    }
  };

  regenHpToAllPlayers = async () => {
    const players = await PlayerModel.getAllFromChat(this.chatId, true);
    players?.forEach((player) => {
      player.passiveRegen(HP_REGEN_PERCENTAGE);
    });
  };

  //   startApIncome = () => {
  //     if (this.ap_gain_timer == undefined) {
  //       clearInterval(this.ap_gain_timer);
  //       this.ap_gain_timer = undefined;
  //     }
  //     this.ap_gain_timer = setInterval(this.grantAPToAllPlayers, this.ap_gain_rate);
  //   };

  //   grantAPToAllPlayers = async () => {
  //     const players = await db?.PlayerModel.getAllFromChat(this.chat_id, true);
  //     players?.forEach((player) => {
  //       player.gainAP(1);
  //     });
  //   };
}
