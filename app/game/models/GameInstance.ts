import TelegramBot = require("node-telegram-bot-api");
import { PlayerModel } from "../../database/players/players.model";
import { Enemy } from "./Enemy";
import { logger } from "../../utils/logger";

import enemies = require("../../database/enemies/enemies.json");
import { getRandomInt } from "../../utils/utils";

export class GameInstance {
    private chat_id: number;
    private bot: TelegramBot;
    private spawn_probabilities: number[];

    constructor({ chat_id, bot }: { chat_id: number, bot: TelegramBot }) {
        this.chat_id = chat_id;
        this.bot = bot;


        this.spawn_probabilities = [];
        this.generateSpawnProbabilities();
    }

    start = () => {

    }

    spawnEnemy = async () => {
        let enemy = await this.getRandomEnemy();
        logger.verbose(`Spawning enemy [${enemy.name}] in ${this.chat_id}`);
        enemy.spawn();
    }

    getRandomEnemy = async (): Promise<Enemy> => {
        let enemy_level = await PlayerModel.getRandomMinMaxLvl(this.chat_id) ?? 1;

        //Randomly picks enemy type to spawn, repicks if lvl requirements are out of bounds
        let enemy_type;
        do {
            enemy_type = this.getRandomEnemyType();
        } while (enemies[enemy_type].min_lvl > enemy_level || enemies[enemy_type].max_lvl < enemy_level);

        return Enemy.fromJson({ bot: this.bot, json: enemies[enemy_type], chat_id: this.chat_id, level: enemy_level, on_death: () => { } });
    }

    getRandomEnemyType = (): number => {
        let spawn_probability = getRandomInt(0, 100);
        let enemy_type = 0;
        while (this.spawn_probabilities[enemy_type] <= spawn_probability) {
            enemy_type++;
        }

        return enemy_type;
    }

    //Generates table with spawn probabilities for different types of mobs
    generateSpawnProbabilities = () => {
        let prev_porbability = 0;
        enemies.forEach((enemy) => {
            this.spawn_probabilities.push(prev_porbability + enemy.spawn_chance);
            prev_porbability += enemy.spawn_chance;
        });
    }
}