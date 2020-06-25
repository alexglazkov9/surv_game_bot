import winston = require("winston");

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.label({ label: "SurvgramBot" }),
    winston.format.json(),
    winston.format.colorize(),
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    })
  ),
  transports: [new winston.transports.Console({ level: "debug" })],
  exceptionHandlers: [new winston.transports.Console()],
  exitOnError: false,
});
