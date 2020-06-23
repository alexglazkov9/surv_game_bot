import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { getRandomInt } from "../../utils/utils";
import { CallbackData } from "./CallbackData";
import { CallbackActions } from "../misc/CallbackConstants";
import { IPlayerDocument } from "../../database/players/players.types";

const UPDATE_DELAY = 5000;

export class Enemy {
    id: number;
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
    attack_timers_players: { [id: number]: number } = {};
    previous_message?: string;
    on_death: () => void;

    constructor({ name, chat_id, hp = 10, level = 1, on_death = () => { }, exp_on_death = 1, money_on_death = 0, damage = 1, attack_rate_minutes = 1 / 6, item_drop_chance = [], attack_rate_fight = 1500 }:
        { name: string, chat_id: number, hp: number, level: number, on_death: () => void, exp_on_death: number, money_on_death: number, damage: number, attack_rate_minutes: number, item_drop_chance: any[], attack_rate_fight: number }) {
        this.id = Date.now();
        this.chat_id = chat_id;
        this.name = name;
        this.level = level;
        this.hp_max = hp;
        this.hp = hp;
        this.exp_on_death = exp_on_death;
        this.money_on_death = money_on_death;
        this.combat_log = '\n📜*Combat Log*\n';
        this.damage = damage;
        this.attack_rate = attack_rate_minutes * 60 * 1000;
        this.item_drop = this.getDroppedItem(item_drop_chance);
        this.on_death = on_death;
        this.players_fighting = [];
        this.attack_rate_fight = attack_rate_fight;
    }

    static fromJson = (json: any, chat_id: number, level: number = 1, on_death: () => void) => {
        let enemy = new Enemy({
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

    /*
        Sends a mob message to the chat and sets up callback_query 
        listener that handles attacks from players
    */
    spawn = async () => {
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

        var message = await bot.sendMessage(this.chat_id, this.greeting(), opts);
        this.message_id = message.message_id;

        this.attack_timer = setInterval(this.dealDamage, this.attack_rate);
        this.attack_fight_timer = setInterval(this.dealDamageInFight, this.attack_rate_fight);
        bot.on('callback_query', this.onCallbackQuery);
        this.update_timer = setInterval(() => this.sendUpdate(), UPDATE_DELAY);
        this.dealDamage();
    }

    /*
        Listens for players' clicks to join the fight
    */
    onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        const callback_data = CallbackData.fromJson(callbackQuery.data);

        if (callback_data.action === CallbackActions.JOIN_FIGHT) {
            let player = await (await db?.PlayerModel.findPlayer({ telegram_id: callbackQuery.from.id, chat_id: this.chat_id }));

            if (player !== undefined) {
                if (this.players_fighting.findIndex((pl) => { return pl.telegram_id === player?.telegram_id; }) !== -1) {
                    let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                        callback_query_id: callbackQuery.id,
                        text: "You are in the fight",
                        show_alert: false,
                    };
                    bot.answerCallbackQuery(opts_call);
                    return;
                } else {
                    //Stop auto-attacking all players
                    if (this.attack_timer !== undefined) {
                        clearInterval(this.attack_timer);
                        this.attack_timer = undefined;
                        this.combat_log += `\n⚔️FIGHT STARTED⚔️\n`
                    }
                    //Add player to the list of attackers
                    this.players_fighting.push(player);
                    this.combat_log += `➕${player.name} has joined he fight\n`;
                    //Setup player attack handler
                    this.attack_timers_players[player.telegram_id] = setTimeout(this.handlePlayerAttack, player.getAttackSpeed(), player);
                    let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                        callback_query_id: callbackQuery.id,
                        text: "You joined the fight",
                        show_alert: false,
                    };
                    bot.answerCallbackQuery(opts_call);
                }
            }
        }
    }

    handlePlayerAttack = async (player: IPlayerDocument) => {
        
        if (this.hp > 0 && player.canAttack()) {
            this.combat_log += `🔸 ${player.name}_${player.getShortStats()} deals ${player.getHitDamage().toFixed(1)} damage_\n`;
            await player.hitEnemy(this);
            console.log('player attacking');
            this.attack_timers_players[player.telegram_id] = setTimeout(this.handlePlayerAttack, player.getAttackSpeed(), player);
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
            var dmg_dealt = player.takeDamage(this.damage);
            this.combat_log += `🔹 ${this.name} _deals ${dmg_dealt.toFixed(1)} damage to_ ${player.name}_${player.getShortStats()}_\n`;
            if (!player.isAlive()) {
                this.combat_log += `🔹 ${this.name} _murdered_ ${player.name}_${player.getShortStats()}_\n`;

                clearInterval(this.attack_timers_players[player.telegram_id]);
                this.players_fighting.splice(rndIndex, 1);

                if (this.players_fighting.length === 0) {
                    this.despawn();
                }
            }
        }
    }

    dealDamage = async () => {
        let player = await db?.PlayerModel.getRandomPlayer(this.chat_id, true);
        if (player != null) {
            var hide_markup = false;
            var dmg_dealt = player.takeDamage(this.damage);

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

    getDroppedItem = (item_drop_chance: any[]): string | null => {
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
        bot.editMessageText(message_text, opts);
    }

    rewardPlayers = async (): Promise<void> => {
        let rndIndex = getRandomInt(0, this.players_fighting.length);
        let player;
        let index = 0;
        for(player of this.players_fighting){
            player.money += (this.money_on_death / this.players_fighting.length);
            player.gainXP(this.exp_on_death / this.players_fighting.length);
            if (this.item_drop != null && index === rndIndex) {
                let player = this.players_fighting[rndIndex];
                await player.addItemToInventory(this.item_drop);
                this.combat_log += `🔮${player.name} picks up ${this.item_drop}\n`;
            }
            await player.save();
            index++;
        }

        this.combat_log += `🎁Players get: ${(this.exp_on_death / this.players_fighting.length).toFixed(1)} exp ${this.money_on_death > 0 ? `, ${(this.money_on_death/this.players_fighting.length).toFixed(2)} money` : ""}_\n`
    }

    despawn = async (): Promise<void> => {
        bot.removeListener('callback_query', this.onCallbackQuery);

        this.clearAllIntervals();

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