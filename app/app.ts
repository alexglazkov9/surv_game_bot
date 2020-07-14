import { connect } from "./database/database";
import { logger } from "./utils/logger";
import TelegramBot = require("node-telegram-bot-api");
import { GameManager } from "./game/models/GameManager";

let token: string;
const botOptions: TelegramBot.ConstructorOptions = {};

if (process.env.TOKEN === undefined) {
  logger.error("Telegram Bot token is not set");
}

if (process.env.NODE_ENV === "production") {
  token = process.env.TOKEN ?? "";
  const port: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  botOptions.webHook = {
    port,
  };

  logger.info(`Production mode: Starting on port ${port}`);
} else if (process.env.NODE_ENV === "local_prod") {
  token = process.env.TOKEN ?? "";

  botOptions.polling = true;

  logger.info("Local prod mode: Starting polling");
} else {
  token = process.env.TELEGRAM_TOKEN_TEST ?? "";

  botOptions.polling = true;

  logger.info("Dev mode: Starting polling");
}

export const bot = new TelegramBot(token, botOptions);
if (process.env.NODE_ENV === "production") {
  const url = process.env.HEROKU_URL + "/bot" + token;
  bot.setWebHook(url);
  logger.info(`Webhook set to ${url}`);
}

export const db = connect();

export const gameManager = new GameManager({ bot });
gameManager.launch();
