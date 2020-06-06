import * as TelegramBot from "node-telegram-bot-api";
import * as config from "config";
import { connect } from "./database/database";

import { startGame } from "./game/game";


export const bot = new TelegramBot(config.get("botTokenTest"), { polling: true });
export const db = connect();

startGame();