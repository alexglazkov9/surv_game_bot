import * as TelegramBot from "node-telegram-bot-api";
import * as config from "config";
import { connect } from "./database/database";

import { startGame } from "./game/game";


//export const bot = new TelegramBot(config.get("botTokenTest"));
let token: string = process.env.TOKEN || config.get("botTokenTest");

let botOptions: TelegramBot.ConstructorOptions = {};

if (process.env.NODE_ENV === 'production') {
    let port: number = parseInt(process.env.PORT ?? '') || 3000;
    let host = '0.0.0.0';
    console.log('Starting webhook');
    botOptions.webHook = {
        port,
        host
    };
} else {
    console.log('Starting polling');
    botOptions.polling = true;
}

export const bot = new TelegramBot(token, botOptions);
if (process.env.NODE_ENV === 'production') {
    bot.setWebHook(process.env.HEROKU_URL + ':443/bot' + token);
}
export const db = connect();

startGame();