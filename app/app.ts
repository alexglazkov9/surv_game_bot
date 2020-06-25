import config = require("config");
import { connect } from "./database/database";
import { logger } from "./utils/logger";
import TelegramBot = require("node-telegram-bot-api");
import { GameManager } from "./game/models/GameManager";



let token: string;
let botOptions: TelegramBot.ConstructorOptions = {};

if (process.env.NODE_ENV === 'production') {
    token = process.env.TOKEN ?? '';
    let port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    botOptions.webHook = {
        port
    };
    logger.info(`Production mode: Starting on port ${port}`);
} else if (process.env.NODE_ENV === 'local_prod') {
    token = process.env.TOKEN ?? '';
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

export const db = connect();

let game_manager = new GameManager({ bot });
game_manager.launch();
