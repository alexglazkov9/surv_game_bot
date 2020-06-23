import * as TelegramBot from "node-telegram-bot-api";
import * as config from "config";
import { connect } from "./database/database";

import { startGame } from "./game/game";


//export const bot = new TelegramBot(config.get("botTokenTest"));
let token: string = process.env.TOKEN || config.get("botTokenTest");
let bot: TelegramBot;
if (process.env.NODE_ENV === 'production') {
    let port: number = parseInt(process.env.PORT ?? '') || 3000;
    console.log('Starting in production');
    bot = new TelegramBot(token, { webHook: { port: port, host: process.env.HEROKU_URL } });
} else {
    bot = new TelegramBot(token, { polling: true });
}
export const db = connect();

export { bot };

startGame();