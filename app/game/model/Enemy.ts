import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");
import { getRandomInt } from "../../utils/utils";
import { ConsumableModel } from "../../database/items/items.model";

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
    attack_timer?: NodeJS.Timeout;
    item_drop: string | null;
    on_death: () => void;

    constructor({ name, chat_id, hp = 10, level = 1, on_death = () => {}, exp_on_death = 1, money_on_death = 0, damage = 1, attack_rate_minutes = 1 / 6, item_drop_chance = [] }:
        { name: string, chat_id: number, hp: number, level: number, on_death: () => void, exp_on_death: number, money_on_death: number, damage: number, attack_rate_minutes: number, item_drop_chance: any[] }) {
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
            item_drop_chance: json.item_drop ?? []
        });
        return enemy;
    }

    /*
        Sends a mob message to the chat and sets up callback_query 
        listener that handles attacks from players
    */
    spawn = async () => {
        let opts: TelegramBot.SendMessageOptions = {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Hit',
                            callback_data: 'hit_' + this.id
                        }
                    ]
                ]
            }
        };

        var message = await bot.sendMessage(this.chat_id, this.greeting(), opts);
        this.message_id = message.message_id;

        this.attack_timer = setInterval(this.dealDamage, this.attack_rate);
        bot.on('callback_query', this.onCallbackQuery);
        //Hit once after spawned
        this.dealDamage();
    }

    /*
        Listens for attacks from players
    */
    onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
        const action = callbackQuery.data;
        let player = await (await db?.PlayerModel.findPlayer({ telegram_id: callbackQuery.from.id, chat_id: this.chat_id }));

        if (action === 'hit_' + this.id && this.hp > 0 && player != null && player.canAttack(callbackQuery.id)) {

            var hide_markup = false;

            player.hitEnemy(this);

            this.combat_log += `🔸 ${player.name}_${player.getShortStats()} deals ${player.getHitDamage().toFixed(1)} damage_\n`;

            if (this.hp <= 0) {
                this.hp = 0;

                hide_markup = true;

                this.despawn();

                this.combat_log += `✨${this.name} _slained by_ ${player.name}_${player.getShortStats()} for ${this.exp_on_death.toFixed(1)} exp ${this.money_on_death > 0 ? ` and ${this.money_on_death.toFixed(2)} money` : ""}_ ${this.item_drop ? ` and dropped ${this.item_drop}` : ""}`;
            }

            let opts: TelegramBot.EditMessageTextOptions = {
                parse_mode: "Markdown",
                chat_id: this.chat_id,
                message_id: this.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Hit',
                                callback_data: 'hit_' + this.id
                            }
                        ]
                    ]
                },
            };

            if (hide_markup) {
                delete opts.reply_markup;
            }

            bot.editMessageText(this.buildMessageText(), opts);
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
                this.combat_log += `🔹 ${this.name} _left battle_\n`;
                this.despawn();
                hide_markup = true;
            }

            let opts: TelegramBot.EditMessageTextOptions = {
                parse_mode: "Markdown",
                chat_id: this.chat_id,
                message_id: this.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Hit',
                                callback_data: 'hit_' + this.id
                            }
                        ]
                    ]
                },
            };

            if (hide_markup) {
                delete opts.reply_markup;
            }

            bot.editMessageText(this.buildMessageText(), opts);
        }
    }


    takeDamage = (dmg: number) => {
        this.hp -= dmg;
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

    despawn = (): void => {
        bot.removeListener('callback_query', this.onCallbackQuery);
        if (this.attack_timer !== undefined) {
            clearInterval(this.attack_timer);
        }
        console.log(this.chat_id + ": Calling on_death");
        this.on_death();
    }
}