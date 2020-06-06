import { bot, db } from "../../app";
import TelegramBot = require("node-telegram-bot-api");

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
    combat_log: string;
    attack_rate: number;
    attack_timer?: NodeJS.Timeout;

    constructor(name: string, chat_id: number, hp: number = 10, level: number = 1, exp_on_death: number = 1, damage: number = 1, attack_rate_minutes: number = 1/6) {
        this.id = Date.now();
        this.chat_id = chat_id;
        this.name = name;
        this.level = level;
        this.hp_max = hp;
        this.hp = hp;
        this.exp_on_death = exp_on_death;
        this.combat_log = '\n📜*Combat Log*\n';
        this.damage = damage;
        this.attack_rate = attack_rate_minutes * 60 * 1000;
    }

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
    }

    onCallbackQuery = async (callbackQuery: any) => {
        const action = callbackQuery.data;
        let player = await db?.PlayerModel.findPlayer({ telegram_id: callbackQuery.from.id, chat_id: this.chat_id });

        if (action === 'hit_' + this.id && this.hp > 0 && player != null && player.canAttack()) {
            var hide_markup = false;

            player.hitEnemy(this);

            this.combat_log += `🔸 ${player.name} deals ${player.getHitDamage()} damage\n`;

            if (this.hp <= 0) {
                this.hp = 0;

                hide_markup = true;

                bot.removeListener('callback_query', this.onCallbackQuery);
                if (this.attack_timer !== undefined) {
                    clearInterval(this.attack_timer);
                }

                player.experience += this.exp_on_death;
                player.recalculateAndSave();

                this.combat_log += `✨${this.name} slained by ${player.name} for ${this.exp_on_death} exp`;
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
            player.takeDamage(this.damage);
            //player?.recalculateAndSave();
            this.combat_log += `🔹 ${this.name} deals ${this.damage} damage to ${player.name}\n`;

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
            *${this.name}*\n
            💚 *HP*: ${this.hp}\\${this.hp_max}
            🗡 *Damage*: ${this.damage}
            `;
    }

}