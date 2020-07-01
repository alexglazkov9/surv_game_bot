import Mongoose = require("mongoose");
import { logger } from "../utils/logger";

let database: Mongoose.Connection;

export const connect = () => {
  if (process.env.MONGO_URI === undefined && process.env.MONGO_URI_TEST === undefined) {
    logger.error("Database connection string is not set");
  }
  let uri: string;
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "local_prod") {
    uri = process.env.MONGO_URI ?? "";

    logger.info("Connecting to prod database");
  } else {
    uri = process.env.MONGO_URI_TEST ?? "";

    logger.info("Connecting to testing database");
  }

  if (database) {
    return;
  }

  Mongoose.connect(uri, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  });

  database = Mongoose.connection;

  database.once("open", async () => {
    logger.info("Connected to database");
  });

  database.on("error", () => {
    logger.error("Error connecting to database");
  });
};

export const disconnect = () => {
  if (!database) {
    return;
  }

  Mongoose.disconnect();
};
