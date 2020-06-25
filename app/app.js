"use strict";
exports.__esModule = true;
exports.db = exports.bot = void 0;
var config = require("config");
var database_1 = require("./database/database");
var game_1 = require("./game/game");
var logger_1 = require("./utils/logger");
var TelegramBot = require("node-telegram-bot-api");
var token;
var botOptions = {};
if (process.env.NODE_ENV === 'production') {
    token = '545524337:AAEw_0gphLRU2b5ydvQy1HE-hlmva0UGYow';
    var port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    botOptions.webHook = {
        port: port
    };
    logger_1.logger.info("Production mode: Starting on port " + port);
}
else if (process.env.NODE_ENV === 'local_prod') {
    token = '545524337:AAEw_0gphLRU2b5ydvQy1HE-hlmva0UGYow';
    logger_1.logger.info('Local prod mode: Starting polling');
    botOptions.polling = true;
}
else {
    token = config.get("botTokenTest");
    logger_1.logger.info('Dev mode: Starting polling');
    botOptions.polling = true;
}
exports.bot = new TelegramBot(token, botOptions);
if (process.env.NODE_ENV === 'production') {
    var url = process.env.HEROKU_URL + '/bot' + token;
    exports.bot.setWebHook(url);
    logger_1.logger.info("Webhook set to " + url);
}
exports.bot.onText(/\/start_game/, game_1.start_game);
exports.bot.onText(/^\/reg ?(.*)/, game_1.reg);
exports.bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, game_1.character);
exports.bot.onText(/^\/inventory@?[A-z]*/, game_1.inventory);
exports.bot.onText(/\/shop@?[A-z]*/, game_1.shop);
exports.bot.onText(/\/spawn_enemy/, game_1.spawn_enemy);
exports.bot.onText(/\/respawn/, game_1.respawn);
exports.db = database_1.connect();
game_1.startGame();
