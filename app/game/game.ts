import { bot, db } from "../app";
import { Enemy } from "./model/Enemy";
import { GameInstance } from "./model/GameInstance";
import TelegramBot = require("node-telegram-bot-api");
import { IItemModel, IItemDocument } from "../database/items/items.types";

let game_instances: { [id: number]: GameInstance } = {};


export function startGame() {
    initAllGameSessions();

    bot.onText(/\/start_game/, async (msg, match) => {
        let opts = {
            reply_to_message_id: msg.message_id,
        }

        let sessionsExists = await db?.SessionModel.sessionExists({ chat_id: msg.chat.id });

        if (sessionsExists) {
            bot.sendMessage(msg.chat.id, "Game is running!", opts);
        } else {
            let session = await db?.SessionModel.createNewSession(msg.chat.id);
            if (session) {
                bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
                game_instances[msg.chat.id] = new GameInstance(msg.chat.id);
                game_instances[msg.chat.id].start();
            } else {
                bot.sendMessage(msg.chat.id, "Something went wrong", opts);
            }
        }
    });

    /*
        /reg {nickname}

        Creates a new player profile.
        Doesn't do anyhting if profile exists.
    */
    bot.onText(/\/reg ?(.*)/, async (msg, match) => {
        if (match && match[1]) {
            let opts: TelegramBot.SendMessageOptions = {
                parse_mode: "Markdown",
                reply_to_message_id: msg.message_id,
            }

            let playerExists = await db?.PlayerModel.playerExists({ telegram_id: msg.from?.id, chat_id: msg.chat.id });

            if (playerExists) {
                bot.sendMessage(msg.chat.id, `You are already in the game.`, opts);
                return;
            }

            if (match[1].length < 3) {
                bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is too short. (Minimum 3 characters)`, opts);
                return;
            }

            let isNameTaken = await db?.PlayerModel.isNameTaken(match[1]);

            if (isNameTaken) {
                bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is already taken.`, opts);
            } else {
                let player = await db?.PlayerModel.createNewPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id, name: match[1] });
                if (player) {
                    bot.sendMessage(msg.chat.id, `Welcome to the game ${player.name}`, opts);
                } else {
                    bot.sendMessage(msg.chat.id, `Something went wrong`, opts);
                }
            }
        } else {
            bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
        }
    });

    bot.onText(/\/character ?(.*)/, async (msg, match) => {
        let opts: TelegramBot.SendMessageOptions = {
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown",
        }
        if (match && match[1]) {
            return;
        } else {
            let player = await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
            if (player != null) {
                bot.sendMessage(msg.chat.id, player.getPlayerStats(), opts);
            } else {
                bot.sendMessage(msg.chat.id, "You don't have a character", opts);
            }
        }
    });

    bot.onText(/\/respawn/, async (msg) => {
        const players = await db?.PlayerModel.getAllFromChat(msg.chat.id, false);
        players?.forEach((player) => {
            player.revive();
        });
    });

    bot.onText(/\/spawn_enemy/, async (msg) => {
        game_instances[msg.chat.id].spawnEnemy();
    });

    bot.onText(/\/add_item/, async (msg) => {
        await db?.ItemModel.create({ name: "Dick" });
        let weapon = await db?.WeaponModel.create({ name: "Fist2", damage: 1, ap_cost: 1, durability: -1 });
        let cons = await db?.ConsumableModel.create({ name: "HealthPotion2", charges: 1 });
        let player = await db?.PlayerModel.findOne({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
        let items = new Array<IItemDocument>();
        if (weapon != undefined && cons != undefined) {
            items.push(weapon);
            items.push(cons);
            player?.inventory.concat(items);
        }
        player?.save();
    });
}

async function initAllGameSessions() {
    const sessions = await db?.SessionModel.getAll();
    sessions?.forEach((session) => {
        let game = new GameInstance(session.chat_id);
        game_instances[session.chat_id] = game;
        game.start();
    });
}
