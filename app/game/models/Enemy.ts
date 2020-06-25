import EventEmitter = require("events");
import { IPlayerDocument } from "../../database/players/players.types";
import { getRandomInt } from "../../utils/utils";
import { CallbackData } from "./CallbackData";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackActions } from "../misc/CallbackConstants";
import { logger } from "../../utils/logger";
import { PlayerModel } from "../../database/players/players.model";

const UPDATE_DELAY = 5000;
const ATTACK_CHAT_EVENT = 'attack_chat_event';
const ATTACK_FIGHT_EVENT = 'attack_fight_event';
const ATTACK_BY_PLAYER = 'attack_by_player';
const UPDATE_EVENT = 'update_event';

export class Enemy extends EventEmitter.EventEmitter {
    id: number;
    bot: TelegramBot;
    chat_id: number;
    name: string;
    level: number;
    hp_max: number;
    hp: number;
    damage: number;
    message_id?: number;
    exp_on_death: number;
    money_on_death: number;
    combat_log: string;
    attack_rate: number;
    attack_rate_fight: number;
    attack_timer?: NodeJS.Timeout;
    attack_fight_timer?: NodeJS.Timeout;
    update_timer?: NodeJS.Timeout;
    item_drop: string | null;
    players_fighting: IPlayerDocument[];
    attack_timers_players: { [id: number]: NodeJS.Timeout } = {};
    previous_message?: string;
    on_death: () => void;

    constructor({ bot, name, chat_id, hp = 10, level = 1, on_death = () => { }, exp_on_death = 1, money_on_death = 0, damage = 1, attack_rate_minutes = 1 / 6, item_drop_chance = [], attack_rate_fight = 1500 }:
        { bot: TelegramBot, name: string, chat_id: number, hp: number, level: number, on_death: () => void, exp_on_death: number, money_on_death: number, damage: number, attack_rate_minutes: number, item_drop_chance: any[], attack_rate_fight: number }) {
        super();

        this.id = Date.now();

        this.bot = bot;
        this.chat_id = chat_id;
        this.name = name;
        this.level = level;
        this.hp_max = hp;
        this.hp = hp;
        this.exp_on_death = exp_on_death;
        this.money_on_death = money_on_death;
        this.damage = damage;
        this.attack_rate = attack_rate_minutes * 60 * 1000;
        this.attack_rate_fight = attack_rate_fight;

        this.on_death = on_death;

        this.item_drop = this.getDropItem(item_drop_chance);
        this.combat_log = '\n📜*Combat Log*\n';
        this.players_fighting = [];

        this.addListener(ATTACK_CHAT_EVENT, this.dealDamage);
        this.addListener(ATTACK_FIGHT_EVENT, this.dealDamageInFight);
        this.addListener(UPDATE_EVENT, this.sendUpdate);
    }

    //Creates enemy from json config
    static fromJson = ({ bot, json, chat_id, level = 1, on_death }: { bot: TelegramBot, json: any, chat_id: number, level: number, on_death: () => void }) => {
        let enemy = new Enemy({
            bot,
            name: json.name,
            chat_id,
            hp: json.hp * (1 + 0.1 * level),
            level,
            on_death,
            exp_on_death: (level * json.hp + level * json.damage * 2) / 5,
            money_on_death: json.money_drop * (1 + 0.1 * level),
            damage: json.damage * (1 + 0.1 * level),
            attack_rate_minutes: json.attack_rate_minutes,
            item_drop_chance: json.item_drop ?? [],
            attack_rate_fight: json.attack_rate_fight,
        });
        return enemy;
    }

    spawn = async () => {
        this.message_id = await this.sendEnemyMessage();

        this.bot.on('callback_query', this.onCallbackQuery);

        this.attack_timer = setInterval(() => this.emit(ATTACK_CHAT_EVENT), this.attack_rate);
        this.attack_fight_timer = setInterval(() => this.emit(ATTACK_FIGHT_EVENT), this.attack_rate_fight);
        this.update_timer = setInterval(() => this.emit(UPDATE_EVENT), UPDATE_DELAY);

        logger.verbose(`Enemy ${this.name} spawned in ${this.chat_id}`);

        //Attack as soon as enemy spawned
        this.dealDamage();
    }

    sendEnemyMessage = async (): Promise<number> => {
        let callback_data = new CallbackData({ action: CallbackActions.JOIN_FIGHT, telegram_id: undefined, payload: this.id });
        let opts: TelegramBot.SendMessageOptions = {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Join fight',
                            callback_data: callback_data.toJson(),
                        }
                    ]
                ]
            }
        };

        let message = await this.bot.sendMessage(this.chat_id, this.greeting(), opts);
        return message.message_id;
    }

    onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        const callback_data = CallbackData.fromJson(callbackQuery.data);

        if (callback_data.action === CallbackActions.JOIN_FIGHT) {
            let player = await (await PlayerModel.findPlayer({ telegram_id: callbackQuery.from.id, chat_id: this.chat_id }));
            if (player !== undefined) {
                if (this.players_fighting.findIndex((pl) => { return pl.telegram_id === player?.telegram_id; }) !== -1) {
                    let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                        callback_query_id: callbackQuery.id,
                        text: "You are in the fight",
                        show_alert: false,
                    };
                    this.bot.answerCallbackQuery(opts_call);
                    return;
                } else {
                    let opts_call: TelegramBot.AnswerCallbackQueryOptions;
                    if (player.isAlive()) {
                        //Stop auto-attacking all players
                        if (this.attack_timer !== undefined) {
                            clearInterval(this.attack_timer);
                            this.attack_timer = undefined;
                            this.combat_log += `\n⚔️FIGHT STARTED⚔️\n`
                        }
                        //Add player to the list of attackers
                        this.players_fighting.push(player);
                        this.combat_log += `➕${player.name} has joined he fight\n`;
                        logger.verbose(`Player ${player?.name} joined the fight in ${this.chat_id}`);
                        //Setup player attack handler
                        this.addListener(ATTACK_BY_PLAYER + player.telegram_id, () => this.handlePlayerAttack(player));
                        this.attack_timers_players[player.telegram_id] = setTimeout(() => this.emit(ATTACK_BY_PLAYER + player.telegram_id), player.getAttackSpeed());
                        opts_call = {
                            callback_query_id: callbackQuery.id,
                            text: "You joined the fight",
                            show_alert: false,
                        };
                    }else{
                        opts_call = {
                            callback_query_id: callbackQuery.id,
                            text: "You are DEAD",
                            show_alert: false,
                        };
                    }
                    this.bot.answerCallbackQuery(opts_call);
                }
            }
        }
    }

    handlePlayerAttack = async (player: IPlayerDocument) => {
        if (this.hp > 0 && player.canAttack()) {
            this.combat_log += `🔸 ${player.name}_${player.getShortStats()} deals ${player.getHitDamage().toFixed(1)} damage_\n`;
            await player.hitEnemy(this);
            logger.verbose(`Player ${player?.name} in ${this.chat_id} attacked enemy for ${player.getHitDamage().toFixed(1)}`);
            this.attack_timers_players[player.telegram_id] = setTimeout(() => this.emit(ATTACK_BY_PLAYER + player.telegram_id), player.getAttackSpeed());
        }
    }

    takeDamage = (player: IPlayerDocument) => {
        this.hp -= player.getHitDamage();
        if (this.hp <= 0) {
            this.hp = 0;
            this.combat_log += `✨${this.name} _slained by_ ${player.name}_${player.getShortStats()}\n`;

            this.despawn();
        }
    }

    dealDamageInFight = async () => {
        let rndIndex = getRandomInt(0, this.players_fighting.length);
        let player = this.players_fighting[rndIndex];
        if (player != undefined) {
            var dmg_dealt = await player.takeDamage(this.damage);
            logger.verbose(`Player ${player?.name} in ${this.chat_id} was damaged in fight for ${dmg_dealt}`);
            this.combat_log += `🔹 ${this.name} _deals ${dmg_dealt.toFixed(1)} damage to_ ${player.name}_${player.getShortStats()}_\n`;
            if (!player.isAlive()) {
                this.combat_log += `🔹 ${this.name} _murdered_ ${player.name}_${player.getShortStats()}_\n`;

                clearInterval(this.attack_timers_players[player.telegram_id]);
                this.players_fighting.splice(rndIndex, 1);

                if (this.players_fighting.length === 0) {
                    logger.verbose(`No more players in ${this.chat_id}, leaving...`);
                    this.despawn();
                }
            }
        }
    }

    dealDamage = async () => {
        let player = await PlayerModel.getRandomPlayer(this.chat_id, true);
        if (player != null) {
            var dmg_dealt = await player.takeDamage(this.damage);
            logger.verbose(`Player ${player?.name} in ${this.chat_id} was randomly attacked for ${dmg_dealt}`);

            this.combat_log += `🔹 ${this.name} _deals ${dmg_dealt.toFixed(1)} damage to_ ${player.name}_${player.getShortStats()}_\n`;

            if (!player.isAlive()) {
                this.combat_log += `🔹 ${this.name} _murdered_ ${player.name}_${player.getShortStats()}_\n`;
                this.despawn();
            }
        }
    }

    buildMessageText = (): string => {
        var messageText = '';
        messageText += this.stats();
        messageText += this.combat_log;

        return messageText;
    }

    getDropItem = (item_drop_chance: any[]): string | null => {
        let item_drop_probabilities: number[] = [];
        let item_drops: string[] = [];
        let prev_porbability: number = 0;
        item_drop_chance.forEach((item_chance) => {
            item_drop_probabilities.push(prev_porbability + item_chance.chance);
            prev_porbability += item_chance.chance;
            item_drops.push(item_chance.item_name);
        });

        let drop_probability = getRandomInt(0, 100);
        let drop_type = 0;
        while (item_drop_probabilities[drop_type] <= drop_probability) {
            drop_type++;
        }

        if (item_drops[drop_type] == "Nothing")
            return null;

        return item_drops[drop_type];
    }

    greeting = (): string => {
        return `Wild *${this.name}* spawned!\n`;
    }

    stats = (): string => {
        return `
            *${this.name}* - Level ${this.level}\n
            💚 *HP*: ${this.hp.toFixed(1)}\\${this.hp_max.toFixed(1)}
            🗡 *Damage*: ${this.damage.toFixed(1)}
            `;
    }

    sendUpdate = (hide_markup = false) => {
        let callback_data = new CallbackData({ action: CallbackActions.JOIN_FIGHT, telegram_id: undefined, payload: this.id });
        let opts: TelegramBot.EditMessageTextOptions = {
            parse_mode: "Markdown",
            chat_id: this.chat_id,
            message_id: this.message_id,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Join fight',
                            callback_data: callback_data.toJson(),
                        }
                    ]
                ]
            }
        };

        if (hide_markup) {
            delete opts.reply_markup;
        }

        let message_text = this.buildMessageText();
        if (this.previous_message === message_text) {
            return;
        }
        this.previous_message = message_text;
        this.bot.editMessageText(message_text, opts);
    }

    rewardPlayers = async (): Promise<void> => {
        let rndIndex = getRandomInt(0, this.players_fighting.length);
        let player: IPlayerDocument;
        let index = 0;
        for (player of this.players_fighting) {
            player.money += (this.money_on_death / this.players_fighting.length);
            player.gainXP(this.exp_on_death / this.players_fighting.length);
            if (this.item_drop != null && index === rndIndex) {
                let player = this.players_fighting[rndIndex];
                await player.addItemToInventory(this.item_drop);
                this.combat_log += `🔮${player.name} picks up ${this.item_drop}\n`;

                logger.verbose(`${player.name} picks up ${this.item_drop}`);
            }
            logger.debug(`Saving player in rewardPlayers()`);
            await player.saveWithRetries();
            index++;
        }

        logger.verbose(`Players get: ${(this.exp_on_death / this.players_fighting.length).toFixed(1)} exp ${this.money_on_death > 0 ? `, ${(this.money_on_death / this.players_fighting.length).toFixed(2)} money` : ""}_`);

        this.combat_log += `🎁Players get: ${(this.exp_on_death / this.players_fighting.length).toFixed(1)} exp ${this.money_on_death > 0 ? `, ${(this.money_on_death / this.players_fighting.length).toFixed(2)} money` : ""}_\n`
    }

    despawn = async (): Promise<void> => {
        logger.info(`Enemy ${this.name} is despawning...`);
        this.bot.removeListener('callback_query', this.onCallbackQuery);

        this.clearAllIntervals();

        this.removeAllListeners(ATTACK_CHAT_EVENT);
        this.removeAllListeners(ATTACK_FIGHT_EVENT);
        this.removeAllListeners(UPDATE_EVENT);

        if (this.hp <= 0) {
            await this.rewardPlayers();
        } else {
            this.combat_log += `🔹 ${this.name} _left battle_\n`;
        }

        this.sendUpdate(true);

        this.on_death();
    }

    clearAllIntervals = (): void => {
        if (this.attack_fight_timer !== undefined) {
            clearInterval(this.attack_fight_timer);
        }

        if (this.attack_timer !== undefined) {
            clearInterval(this.attack_timer);
        }

        if (this.update_timer !== undefined) {
            clearInterval(this.update_timer);
        }

        this.players_fighting.forEach((player) => {
            clearInterval(this.attack_timers_players[player.telegram_id]);
        });
    }
}