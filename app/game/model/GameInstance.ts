import { Enemy } from "./Enemy";
import { db, bot } from "../../app";

export class GameInstance {
    chat_id: number;
    spawn_timer?: NodeJS.Timeout;
    spawn_rate: number;
    respawn_timer?: NodeJS.Timeout;
    respawn_rate: number;
    hp_regen_timer?: NodeJS.Timeout;
    hp_regen_rate: number;
    hp_regen_percentage: number;
    ap_gain_timer?: NodeJS.Timeout;
    ap_gain_rate: number;

    constructor(chat_id: number, respawn_rate_minutes: number = 60, spawn_rate_minutes: number = 90, hp_regen_rate_minutes: number = 1, hp_regen_percentage: number = 10, ap_gain_rate_minutes: number = 1/6) {
        this.chat_id = chat_id;
        this.respawn_rate = respawn_rate_minutes * 60 * 1000;
        this.spawn_rate = spawn_rate_minutes * 60 * 1000;
        this.hp_regen_rate = hp_regen_rate_minutes * 60 * 1000;
        this.hp_regen_percentage = hp_regen_percentage;
        this.ap_gain_rate = ap_gain_rate_minutes * 60 * 1000;
    }

    start = () => {
        this.startSpawningEnemies();
        this.startRevivingPlayers();
        this.startHpRegen();
        this.startApIncome();
    }

    startSpawningEnemies = async () => {
        if (this.spawn_timer) {
            clearInterval(this.spawn_timer);
        }
        this.spawn_timer = setInterval(this.spawnEnemy, this.spawn_rate);
    }

    spawnEnemy = () => {
        var enemy = new Enemy("6ix9ine", this.chat_id);
        enemy.spawn();
    }

    startRevivingPlayers = () => {
        if (this.respawn_timer) {
            clearInterval(this.respawn_timer);
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
        if (this.hp_regen_timer) {
            clearInterval(this.hp_regen_timer);
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
        if (this.ap_gain_timer) {
            clearInterval(this.ap_gain_timer);
        }
        this.ap_gain_timer = setInterval(this.grantAPToAllPlayers, this.hp_regen_rate);
    }

    grantAPToAllPlayers = async () => {
        const players = await db?.PlayerModel.getAllFromChat(this.chat_id, true);
        players?.forEach((player) => {
            player.gainAP(1);
        });
    }
}