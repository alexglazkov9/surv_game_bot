import { Enemy } from "./Enemy";
import { db, bot } from "../../app";
import * as enemies from "../../database/enemies/enemies.json";
import { getRandomInt } from "../../utils/utils";

export class GameInstance {
    chat_id: number;
    spawn_timer?: NodeJS.Timeout = undefined;
    spawn_rate: number;
    respawn_timer?: NodeJS.Timeout = undefined;
    respawn_rate: number;
    hp_regen_timer?: NodeJS.Timeout = undefined;
    hp_regen_rate: number;
    hp_regen_percentage: number;
    ap_gain_timer?: NodeJS.Timeout = undefined;
    ap_gain_rate: number;
    spawn_probabilities: number[];

    constructor(chat_id: number,
        respawn_rate_minutes: number = 60,
        spawn_rate_minutes: number = 0.25,
        hp_regen_rate_minutes: number = 60,
        hp_regen_percentage: number = 10,
        ap_gain_rate_minutes: number = 15) {
        this.chat_id = chat_id;
        this.respawn_rate = respawn_rate_minutes * 60 * 1000;
        this.spawn_rate = spawn_rate_minutes * 60 * 1000;
        this.hp_regen_rate = hp_regen_rate_minutes * 60 * 1000;
        this.hp_regen_percentage = hp_regen_percentage;
        this.ap_gain_rate = ap_gain_rate_minutes * 60 * 1000;
        this.spawn_probabilities = [];
        let prev_porbability = 0;
        enemies.forEach((enemy) => {
            this.spawn_probabilities.push(prev_porbability + enemy.spawn_chance);
            prev_porbability += enemy.spawn_chance;
        });
    }

    start = () => {
        this.startSpawningEnemies();
        this.startRevivingPlayers();
        this.startHpRegen();
        this.startApIncome();
    }

    startSpawningEnemies = async () => {
        console.log(this.chat_id + ": Start spawning");
        let msecs = getRandomInt(15, 90) * 60 * 1000;
        console.log(this.chat_id + ": Will be spawned in " + msecs);
        if (this.spawn_timer == undefined) {
            clearTimeout(this.spawn_timer);
            this.spawn_timer = undefined;
        }
        this.spawn_timer = setTimeout(this.spawnEnemy, msecs);
    }

    spawnEnemy = async () => {
        let enemy_level = await db?.PlayerModel.getRandomMinMaxLvl(this.chat_id) ?? 1;
        let enemy_type = this.getRndEnemyType();

        while (enemies[enemy_type].min_lvl > enemy_level || enemies[enemy_type].max_lvl < enemy_level) {
            enemy_type = this.getRndEnemyType();
        }
        let enemy = Enemy.fromJson(enemies[enemy_type], this.chat_id, enemy_level, this.startSpawningEnemies);
        console.log(this.chat_id + ": Spawning");
        enemy.spawn();
    }

    getRndEnemyType = (): number => {

        let spawn_probability = getRandomInt(0, 100);
        let enemy_type = 0;
        while (this.spawn_probabilities[enemy_type] <= spawn_probability) {
            enemy_type++;
        }

        return enemy_type;
    }

    startRevivingPlayers = () => {
        if (this.respawn_timer == undefined) {
            clearInterval(this.respawn_timer);
            this.respawn_timer = undefined;
        }
        this.respawn_timer = setInterval(this.reviveAllPlayers, this.respawn_rate);
    }

    reviveAllPlayers = async () => {
        const players = await db?.PlayerModel.getAllFromChat(this.chat_id, false);
        players?.forEach((player) => {
            player.revive();
        });

        bot.sendMessage(this.chat_id, `👼🏿All players have been respawned.`);
    }

    startHpRegen = () => {
        if (this.hp_regen_timer == undefined) {
            clearInterval(this.hp_regen_timer);
            this.hp_regen_timer = undefined;
        }
        this.hp_regen_timer = setInterval(this.regenHpToAllPlayers, this.hp_regen_rate);
    }

    regenHpToAllPlayers = async () => {
        const players = await db?.PlayerModel.getAllFromChat(this.chat_id, true);
        players?.forEach((player) => {
            player.passiveRegen(this.hp_regen_percentage);
        });
    }

    startApIncome = () => {
        if (this.ap_gain_timer == undefined) {
            clearInterval(this.ap_gain_timer);
            this.ap_gain_timer = undefined;
        }
        this.ap_gain_timer = setInterval(this.grantAPToAllPlayers, this.ap_gain_rate);
    }

    grantAPToAllPlayers = async () => {
        const players = await db?.PlayerModel.getAllFromChat(this.chat_id, true);
        players?.forEach((player) => {
            player.gainAP(1);
        });
    }
}