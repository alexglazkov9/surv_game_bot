"use strict";
exports.__esModule = true;
exports.logger = void 0;
var winston = require('winston');
var myFormat = winston.format.printf(function (_a) {
    var level = _a.level, message = _a.message, label = _a.label, timestamp = _a.timestamp;
    return timestamp + " [" + label + "] " + level + ": " + message;
});
exports.logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(winston.format.label({ label: 'SurvgramBot' }), winston.format.json(), winston.format.colorize(), winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), myFormat),
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `verbose` and below to `combined.log`
        // - Write all logs to console
        //
        //new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        //new winston.transports.File({ filename: 'logs/combined.log', level: 'verbose' }),
        new winston.transports.Console({ level: 'debug' }),
    ],
    rejectionHandlers: [
        //new winston.transports.File({ filename: 'logs/rejections.log' }),
        //new winston.transports.File({ filename: 'logs/combined.log', level: 'verbose' }),
        new winston.transports.Console(),
    ],
    exceptionHandlers: [
        //new winston.transports.File({ filename: 'logs/exceptions.log' }),
        //new winston.transports.File({ filename: 'logs/combined.log', level: 'verbose' }),
        new winston.transports.Console(),
    ],
    exitOnError: false
});
exports.logger.on('error', function () { return; });
