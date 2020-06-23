import * as TelegramBot from "node-telegram-bot-api";
import * as config from "config";
import { connect } from "./database/database";

import { startGame } from "./game/game";
import { logger } from "./utils/logger";


let token: string = process.env.TOKEN || config.get("botTokenTest");
let botOptions: TelegramBot.ConstructorOptions = {};

if (process.env.NODE_ENV === 'production') {
    let port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    let host = '0.0.0.0';
    botOptions.webHook = {
        port,
        host
    };
    logger.info(`Production mode: Starting on ${host}:${port}`);
} else {
    logger.info('Dev mode: Starting polling');
    botOptions.polling = true;
}

export const bot = new TelegramBot(token, botOptions);
if (process.env.NODE_ENV === 'production') {
    let url = process.env.HEROKU_URL + ':443/bot' + token;
    bot.setWebHook(url);
    logger.info(`Webhook set to ${url}`);
}

export const db = connect();

startGame();