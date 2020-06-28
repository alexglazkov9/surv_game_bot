import winston = require("winston");

const myFormat = winston.format.printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.label({ label: "SurvgramBot" }),
    winston.format.json(),
    winston.format.colorize(),
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    myFormat
  ),
  transports: [new winston.transports.Console({ level: "debug" })],
  exceptionHandlers: [new winston.transports.Console()],
  exitOnError: false,
});
