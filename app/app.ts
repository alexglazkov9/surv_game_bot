import config = require("config");
import { connect } from "./database/database";
import { startGame, inventory, shop, character, reg, start_game, spawn_enemy, respawn } from "./game/game";
import { logger } from "./utils/logger";
import TelegramBot = require("node-telegram-bot-api");



let token: string;
let botOptions: TelegramBot.ConstructorOptions = {};

if (process.env.NODE_ENV === 'production') {
    token = '545524337:AAEw_0gphLRU2b5ydvQy1HE-hlmva0UGYow';
    let port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    botOptions.webHook = {
        port
    };
    logger.info(`Production mode: Starting on port ${port}`);
} else if (process.env.NODE_ENV === 'local_prod') {
    token = '545524337:AAEw_0gphLRU2b5ydvQy1HE-hlmva0UGYow';
    logger.info('Local prod mode: Starting polling');
    botOptions.polling = true;
} else {
    token = config.get("botTokenTest");
    logger.info('Dev mode: Starting polling');
    botOptions.polling = true;
}

export const bot = new TelegramBot(token, botOptions);
if (process.env.NODE_ENV === 'production') {
    let url = process.env.HEROKU_URL + '/bot' + token;
    bot.setWebHook(url);
    logger.info(`Webhook set to ${url}`);
}

bot.onText(/\/start_game/, start_game);

bot.onText(/^\/reg ?(.*)/, reg);

bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, character);

bot.onText(/^\/inventory@?[A-z]*/, inventory);

bot.onText(/\/shop@?[A-z]*/, shop);

bot.onText(/\/spawn_enemy/, spawn_enemy);

bot.onText(/\/respawn/, respawn);

export const db = connect();

startGame();