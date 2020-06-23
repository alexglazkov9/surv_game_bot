import * as TelegramBot from "node-telegram-bot-api";
import * as config from "config";
import { connect } from "./database/database";

import { startGame } from "./game/game";


//export const bot = new TelegramBot(config.get("botTokenTest"));
let token: string = process.env.TOKEN || config.get("botTokenTest");
let bot: TelegramBot;
if (process.env.NODE_ENV === 'production') {
    let host = process.env.HOST;
    console.log(host);
    bot = new TelegramBot(token);
    if (process.env.HEROKU_URL) {
        bot.setWebHook(process.env.HEROKU_URL + process.env.TOKEN);
    }
} else {
    bot = new TelegramBot(token, { polling: true });
}
export const db = connect();

export { bot };

startGame();