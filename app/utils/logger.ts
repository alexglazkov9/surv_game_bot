const winston = require('winston');

const myFormat = winston.format.printf(({ level, message, label, timestamp }: { level: any, message: any, label: any, timestamp: any }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.label({ label: 'SurvgramBot' }),
        winston.format.json(),
        winston.format.colorize(),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        myFormat,
    ),
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
    exitOnError: false,
});

logger.on('error', function () { return; });