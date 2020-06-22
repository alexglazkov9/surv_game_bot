import { bot, db } from "../app";
import { Enemy } from "./model/Enemy";
import { GameInstance } from "./model/GameInstance";
import TelegramBot = require("node-telegram-bot-api");
import { IItemModel, IItemDocument, IWeaponDocument, IWeapon, IWeaponModel } from "../database/items/items.types";
import { ItemSchema } from "../database/items/items.schema";
import * as enemies from "../database/enemies/enemies.json";
import { Types } from "mongoose";

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

    bot.onText(/\/character@?[A-z]* ?[A-z0-9]*/, async (msg, match) => {
        if (match && match[1]) {
            return;
        } else {
            let player = await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id });
            if (player != null) {
                player.sendPlayerStats(msg.message_id);
            } else {
                let opts: TelegramBot.SendMessageOptions = {
                    reply_to_message_id: msg.message_id,
                    parse_mode: "Markdown",
                }
                bot.sendMessage(msg.chat.id, "You don't have a character", opts);
            }
        }
    });

    bot.onText(/\/respawn/, async (msg) => {
        if (msg.chat.id != -1001163373375) {
            bot.sendMessage(msg.chat.id, "No cheating here, fag");
            return;
        }
        const players = await db?.PlayerModel.getAllFromChat(msg.chat.id, false);
        players?.forEach((player) => {
            player.revive();
        });
    });

    bot.onText(/\/spawn_enemy/, async (msg) => {
        if (msg.chat.id != -1001163373375) {
            bot.sendMessage(msg.chat.id, "No cheating here, fag");
            return;
        }
        game_instances[msg.chat.id].spawnEnemy();
    });

    bot.onText(/\/add_item/, async (msg) => {
        if (msg.chat.id != -1001163373375) {
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

    bot.onText(/\/inventory/, async (msg, match) => {
        let opts: TelegramBot.SendMessageOptions = {
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown",
        }
        if (match && match[1]) {
            return;
        } else {
            let player = (await db?.PlayerModel.findPlayer({ telegram_id: msg.from?.id, chat_id: msg.chat.id }));
            if (player != null) {
                player.sendInventory(msg.message_id);
            } else {
                bot.sendMessage(msg.chat.id, "You don't have a character", opts);
            }
        }
    });

    bot.onText(/\/shop/, async (msg, match) => {
        let items = (await db?.ItemModel.find({}));
        let num_of_cols = 2;
        let inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [];
        if (items != undefined) {
            let index = 0;
            let row = 0;
            for (row = 0; row < items?.length && index < items?.length; row++) {
                for (let k = 0; k < num_of_cols && index < items?.length; k++) {
                    if (!inline_keyboard[row]) {
                        inline_keyboard[row] = [];
                    }
                    let data = JSON.stringify({ a: "shop", t_id: msg?.from?.id, i_id: items[index]._id });
                    inline_keyboard[row].push({
                        text: items[index].name,
                        callback_data: data
                    });
                    index++;
                }
            }
            let data = JSON.stringify({ a: "shopclose", t_id: msg?.from?.id });
            inline_keyboard[row] = [];
            inline_keyboard[row].push({
                text: "CLOSE",
                callback_data: data
            });
        }

        let opts: TelegramBot.SendMessageOptions = {
            reply_to_message_id: msg.message_id,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: inline_keyboard
            }
        }

        let welcome_txt = "WELCOME TO KORZINKA.UZ\n";

        var message = await bot.sendMessage(msg.chat.id, welcome_txt, opts);

        const onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
            if (message.message_id != callbackQuery.message?.message_id) {
                return;
            }
            const action = callbackQuery.data;
            if (action && action[0] == '{') {

                const data = JSON.parse(action);

                if (data.a == "shop" && data.t_id === callbackQuery.from.id) {

                    var item_id = data.i_id;
                    var item = items?.find((item) => { return item._id.toString() == item_id });

                    let inline_keyboard_selected: TelegramBot.InlineKeyboardButton[][] = [];

                    let buy_btn_data = JSON.stringify({ a: "buy", t_id: msg?.from?.id, i_id: item?._id });
                    inline_keyboard_selected = [[{ text: "BUY", callback_data: buy_btn_data }], ...inline_keyboard];

                    let opts: TelegramBot.EditMessageTextOptions = {
                        message_id: message.message_id,
                        chat_id: message.chat.id,
                        parse_mode: "Markdown",
                        reply_markup: {
                            inline_keyboard: inline_keyboard_selected
                        }
                    }

                    bot.editMessageText(welcome_txt + item?.getItemStats(), opts);
                } else if (data.a == "buy" && data.t_id === callbackQuery.from.id) {
                    let telegram_id = callbackQuery.from.id;
                    let chat_id = message.chat.id;
                    let player = await db?.PlayerModel.findOne({ telegram_id, chat_id });

                    var item_id = data.i_id;
                    var item = items?.find((item) => { return item._id.toString() == item_id });

                    if (item && player) {
                        if (player.money >= item.price) {
                            player.money -= item.price;
                            item._id = new Types.ObjectId();
                            item.isNew = true;
                            player.inventory.push(item);
                            player.save();

                            let opts: TelegramBot.EditMessageTextOptions = {
                                message_id: message.message_id,
                                chat_id: message.chat.id,
                                parse_mode: "Markdown",
                            }

                            bot.editMessageText(`${player?.name} purchased ${item?.name} for ${item?.price}`, opts);
                            bot.removeListener("callback_query", onCallbackQuery);
                        } else {
                            let opts_call: TelegramBot.AnswerCallbackQueryOptions = {
                                callback_query_id: callbackQuery.id,
                                text: "Not enough money",
                                show_alert: false,
                            };
                            bot.answerCallbackQuery(opts_call);
                        }
                    }
                } else if (data.a == "shopclose" && data.t_id === callbackQuery.from.id) {
                    let telegram_id = callbackQuery.from.id;
                    let chat_id = message.chat.id;
                    let player = await db?.PlayerModel.findOne({ telegram_id, chat_id });

                    if (player) {
                        let opts: TelegramBot.EditMessageTextOptions = {
                            message_id: message.message_id,
                            chat_id: message.chat.id,
                            parse_mode: "Markdown",
                        }

                        bot.editMessageText(`${player?.name} walked around the shop, but could not afford to buy anything!`, opts);
                        bot.removeListener("callback_query", onCallbackQuery);
                    }
                }
            }
        }

        bot.on('callback_query', onCallbackQuery);
    });
}

async function initAllGameSessions() {
    const sessions = await db?.SessionModel.getAll();
    sessions?.forEach((session) => {
        if (session.chat_id != -1001444725427) {
            let game = new GameInstance(session.chat_id);
            game_instances[session.chat_id] = game;
            game.start();
        }
    });
}
