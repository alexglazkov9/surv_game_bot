import { bot, db } from "../app";
import { GameInstance } from "./model/GameInstance";
import TelegramBot = require("node-telegram-bot-api");
import { Types } from "mongoose";
import { logger } from "../utils/logger";
import { Shop } from "./model/Shop";
import { Inventory } from "./model/Inventory";

let game_instances: { [id: number]: GameInstance } = {};


export async function startGame() {
    await initAllGameSessions();

    // bot.onText(/\/start_game/, async (msg, match) => {
    //     let opts = {
    //         reply_to_message_id: msg.message_id,
    //     }

    //     let sessionsExists = await db?.SessionModel.sessionExists({ chat_id: msg.chat.id });

    //     if (sessionsExists) {
    //         bot.sendMessage(msg.chat.id, "Game is running!", opts);
    //     } else {
    //         let session = await db?.SessionModel.createNewSession(msg.chat.id);
    //         if (session) {
    //             bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
    //             game_instances[msg.chat.id] = new GameInstance(msg.chat.id);
    //             game_instances[msg.chat.id].start();
    //         } else {
    //             bot.sendMessage(msg.chat.id, "Something went wrong", opts);
    //         }
    //     }
    // });

    /*
        /reg {nickname}

        Creates a new player profile.
        Doesn't do anyhting if profile exists.
    */
    // bot.onText(/^\/reg ?(.*)/, async (msg, match) => {
    //     if (match && match[1]) {
    //         let opts: TelegramBot.SendMessageOptions = {
    //             parse_mode: "Markdown",
    //             reply_to_message_id: msg.message_id,
    //         }

    //         let playerExists = await db?.PlayerModel.playerExists({ telegram_id: msg.from?.id, chat_id: msg.chat.id });

    //         if (playerExists) {
    //             bot.sendMessage(msg.chat.id, `You are already in the game.`, opts);
    //             return;
    //         }

    //         if (match[1].length < 3) {
    //             bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is too short. (Minimum 3 characters)`, opts);
    //             return;
    //         }

    //         let isNameTaken = await db?.PlayerModel.isNameTaken(match[1]);

    //         if (isNameTaken) {
    //             bot.sendMessage(msg.chat.id, `Nickname "${match[1]}" is already taken.`, opts);
    //         } else {
    //             let player = await db?.PlayerModel.createNewPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id, name: match[1] });
    //             if (player) {
    //                 bot.sendMessage(msg.chat.id, `Welcome to the game ${player.name}`, opts);
    //             } else {
    //                 bot.sendMessage(msg.chat.id, `Something went wrong`, opts);
    //             }
    //         }
    //     } else {
    //         bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
    //     }
    // });

    // bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, async (msg, match) => {
    //     let args = msg.text?.split(' ');
    //     if (args && args[1] != undefined) {
    //         let player = await db?.PlayerModel.findPlayerByName({ name: args[1], chat_id: msg.chat.id });
    //         if (player != null) {
    //             player.sendPlayerStats(msg.message_id, msg.from?.id);
    //         } else {
    //             let opts: TelegramBot.SendMessageOptions = {
    //                 reply_to_message_id: msg.message_id,
    //                 parse_mode: "Markdown",
    //             }
    //             let message = await bot.sendMessage(msg.chat.id, "This character doesn't exist", opts);
    //             setTimeout(() => {
    //                 bot.deleteMessage(message.chat.id, message.message_id.toString());
    //                 bot.deleteMessage(msg.chat.id, msg.message_id.toString());
    //             }, 5000);
    //         }

    //     } else {
    //         let player = await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
    //         if (player != null) {
    //             player.sendPlayerStats(msg.message_id);
    //         } else {
    //             let opts: TelegramBot.SendMessageOptions = {
    //                 reply_to_message_id: msg.message_id,
    //                 parse_mode: "Markdown",
    //             }
    //             let message = await bot.sendMessage(msg.chat.id, "You don't have a character", opts);
    //             setTimeout(async () => {
    //                 bot.deleteMessage(message.chat.id, message.message_id.toString());
    //                 bot.deleteMessage(msg.chat.id, msg.message_id.toString());
    //             }, 5000);
    //         }
    //     }
    // });

    //INVENTORY
    // bot.onText(/^\/inventory@?[A-z]*/, async (msg, match) => {
    //     if (msg.from != undefined) {
    //         let inventory = new Inventory({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
    //         inventory.display();
    //     }
    // });

    //SHOP
    // bot.onText(/\/shop@?[A-z]*/, async (msg, match) => {
    //     if (msg.from !== undefined) {
    //         logger.info(`Shop is being opened for ${msg.from.username} in ${msg.chat.title}`);
    //         let shop = new Shop({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
    //         shop.display();
    //     }
    // });

    /* 
        ADMIN COMMANDS - WORK ONLY IN -100116337337
    */
    // bot.onText(/\/respawn/, async (msg) => {
    //     if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
    //         bot.sendMessage(msg.chat.id, "No cheating here, fag");
    //         return;
    //     }
    //     const players = await db?.PlayerModel.getAllFromChat(msg.chat.id, false);
    //     players?.forEach((player) => {
    //         player.revive();
    //     });
    // });

    // bot.onText(/\/spawn_enemy/, async (msg) => {
    //     if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
    //         bot.sendMessage(msg.chat.id, "No cheating here, fag");
    //         return;
    //     }
    //     game_instances[msg.chat.id].spawnEnemy();
    // });

    bot.onText(/\/add_item/, async (msg) => {
        if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
            bot.sendMessage(msg.chat.id, "No cheating here, fag");
            return;
        }
        let player = await db?.PlayerModel.findOne({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
        let inventory = await db?.ItemModel.find({});
        if (inventory !== undefined) {
            let i = 0;
            inventory.forEach((item) => {
                item._id = Types.ObjectId();
                item.isNew = true;
                if (player !== undefined && player !== null) {
                    player.inventory[i++] = item;
                }
            });

            player?.save();
        }
    });
}


export async function spawn_enemy(msg: TelegramBot.Message){
    if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
        bot.sendMessage(msg.chat.id, "No cheating here, fag");
        return;
    }
    game_instances[msg.chat.id].spawnEnemy();
}

export async function respawn(msg: TelegramBot.Message){
    if (msg.chat.id != -1001163373375 && msg.chat.id != -1001429535244) {
        bot.sendMessage(msg.chat.id, "No cheating here, fag");
        return;
    }
    const players = await db?.PlayerModel.getAllFromChat(msg.chat.id, false);
    players?.forEach((player) => {
        player.revive();
    });
}

export function shop(msg: TelegramBot.Message) {
    if (msg.from !== undefined) {
        logger.info(`Shop is being opened for ${msg.from.username} in ${msg.chat.title}`);
        let shop = new Shop({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
        shop.display();
    }
}

export function inventory(msg: TelegramBot.Message) {
    if (msg.from != undefined) {
        let inventory = new Inventory({ chat_id: msg.chat.id, from_id: msg.from?.id, message_id: msg.message_id });
        inventory.display();
    }
}

export async function character(msg: TelegramBot.Message) {
    let args = msg.text?.split(' ');
    if (args && args[1] != undefined) {
        let player = await db?.PlayerModel.findPlayerByName({ name: args[1], chat_id: msg.chat.id });
        if (player != null) {
            player.sendPlayerStats(msg.message_id, msg.from?.id);
        } else {
            let opts: TelegramBot.SendMessageOptions = {
                reply_to_message_id: msg.message_id,
                parse_mode: "Markdown",
            }
            let message = await bot.sendMessage(msg.chat.id, "This character doesn't exist", opts);
            setTimeout(() => {
                bot.deleteMessage(message.chat.id, message.message_id.toString());
                bot.deleteMessage(msg.chat.id, msg.message_id.toString());
            }, 5000);
        }

    } else {
        let player = await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
        if (player != null) {
            player.sendPlayerStats(msg.message_id);
        } else {
            let opts: TelegramBot.SendMessageOptions = {
                reply_to_message_id: msg.message_id,
                parse_mode: "Markdown",
            }
            let message = await bot.sendMessage(msg.chat.id, "You don't have a character", opts);
            setTimeout(async () => {
                bot.deleteMessage(message.chat.id, message.message_id.toString());
                bot.deleteMessage(msg.chat.id, msg.message_id.toString());
            }, 5000);
        }
    }
}

export async function reg(msg: TelegramBot.Message, match: RegExpExecArray | null) {
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
}

export async function start_game(msg: TelegramBot.Message) {
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
}

async function initAllGameSessions() {
    logger.info('Initializing game sessions');
    const sessions = await db?.SessionModel.getAll();
    sessions?.forEach((session) => {
        let game = new GameInstance(session.chat_id);
        game_instances[session.chat_id] = game;
        game.start();
        logger.verbose(`Game instance for chat ${game.chat_id} started`);
    });
}
