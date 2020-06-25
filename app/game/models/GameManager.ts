import { GameInstance } from "./GameInstance"
import TelegramBot = require("node-telegram-bot-api");
import { SessionModel } from "../../database/sessions/sessions.model";
import { logger } from "../../utils/logger";
import { PlayerModel } from "../../database/players/players.model";
import { Shop } from "./Shop";
import { Inventory } from "./Inventory";

export class GameManager {
    private game_instances: { [id: number]: GameInstance };
    private bot: TelegramBot;

    constructor({ bot }: { bot: TelegramBot }) {
        this.game_instances = {};
        this.bot = bot;
    }

    launch = async () => {
        this.setUpCommandsHandlers();
        
        let sessions = await SessionModel.getAll();
        sessions.forEach(session => {
            logger.info(`Starting session for chat_id = ${session.chat_id}`);
            this.game_instances[session.chat_id] = new GameInstance({ chat_id: session.chat_id, bot: this.bot });
            this.game_instances[session.chat_id].start();
        });
    }

    setUpCommandsHandlers = () => {
        this.bot.onText(/\/start_game/, this.start_game);

        this.bot.onText(/^\/reg ?(.*)/, this.reg);

        this.bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, this.character);

        this.bot.onText(/^\/inventory@?[A-z]*/, this.inventory);

        this.bot.onText(/\/shop@?[A-z]*/, this.shop);

        this.bot.onText(/\/spawn_enemy/, this.spawn_enemy);

        this.bot.onText(/\/respawn/, this.respawn);
    }

    spawn_enemy = async (msg: TelegramBot.Message) => {
        if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
            this.bot.sendMessage(msg.chat.id, "No cheating here, fag");
            return;
        }
        this.game_instances[msg.chat.id].spawnEnemy();
    }

    respawn = async (msg: TelegramBot.Message) => {
        if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
            this.bot.sendMessage(msg.chat.id, "No cheating here, fag");
            return;
        }
        const players = await PlayerModel.getAllFromChat(msg.chat.id, false);
        players?.forEach((player) => {
            player.revive();
        });
    }

    shop = async (msg: TelegramBot.Message) => {
        if (msg.from !== undefined) {
            logger.info(`Shop is being opened for ${msg.from.username} in ${msg.chat.title}`);
            let shop = new Shop({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
            shop.display();
        }
    }

    inventory = (msg: TelegramBot.Message) => {
        if (msg.from != undefined) {
            let inventory = new Inventory({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
            inventory.display();
        }
    }

    character = async (msg: TelegramBot.Message) => {
        let args = msg.text?.split(' ');
        if (args && args[1] != undefined) {
            let player = await PlayerModel.findPlayerByName({ name: args[1], chat_id: msg.chat.id });
            if (player != null) {
                player.sendPlayerStats(msg.message_id, msg.from?.id);
            } else {
                let opts: TelegramBot.SendMessageOptions = {
                    reply_to_message_id: msg.message_id,
                    parse_mode: "Markdown",
                }
                let message = await this.bot.sendMessage(msg.chat.id, "This character doesn't exist", opts);
                setTimeout(() => {
                    this.bot.deleteMessage(message.chat.id, message.message_id.toString());
                    this.bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                }, 5000);
            }

        } else {
            let player = await PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
            if (player != null) {
                player.sendPlayerStats(msg.message_id);
            } else {
                let opts: TelegramBot.SendMessageOptions = {
                    reply_to_message_id: msg.message_id,
                    parse_mode: "Markdown",
                }
                let message = await this.bot.sendMessage(msg.chat.id, "You don't have a character", opts);
                setTimeout(async () => {
                    this.bot.deleteMessage(message.chat.id, message.message_id.toString());
                    this.bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                }, 5000);
            }
        }
    }

    reg = async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
        if (match && match[1]) {
            let opts: TelegramBot.SendMessageOptions = {
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id,
            }

            let playerExists = await PlayerModel.playerExists({ telegram_id: msg.from?.id, chat_id: msg.chat.id });

            if (playerExists) {
                this.bot.sendMessage(msg.chat.id, `You are already in the game.`, opts);
                return;
            }

            if (match[1].length < 3) {
                this.bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is too short. (Minimum 3 characters)`, opts);
                return;
            }

            let isNameTaken = await PlayerModel.isNameTaken(match[1]);

            if (isNameTaken) {
                this.bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is already taken.`, opts);
            } else {
                let player = await PlayerModel.createNewPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id, name: match[1] });
                if (player) {
                    this.bot.sendMessage(msg.chat.id, `Welcome to the game ${player.name}`, opts);
                } else {
                    this.bot.sendMessage(msg.chat.id, `Something went wrong`, opts);
                }
            }
        } else {
            this.bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
        }
    }

    start_game = async (msg: TelegramBot.Message) => {
        let opts = {
            reply_to_message_id: msg.message_id,
        }

        let sessionsExists = await SessionModel.sessionExists({ chat_id: msg.chat.id });

        if (sessionsExists) {
            this.bot.sendMessage(msg.chat.id, "Game is running!", opts);
        } else {
            let session = await SessionModel.createNewSession(msg.chat.id);
            if (session) {
                this.bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
                this.game_instances[msg.chat.id] = new GameInstance({ chat_id: session.chat_id, bot: this.bot });;
                this.game_instances[msg.chat.id].start();
            } else {
                this.bot.sendMessage(msg.chat.id, "Something went wrong", opts);
            }
        }
    }
}