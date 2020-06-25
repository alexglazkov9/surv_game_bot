import Mongoose = require("mongoose");
import config = require("config");
import { PlayerModel } from "./players/players.model";
import { SessionModel } from "./sessions/sessions.model";
import { ItemModel, WeaponModel, ConsumableModel, ArmorModel } from "./items/items.model";
import { logger } from "../utils/logger";

let database: Mongoose.Connection;

export const connect = () => {
  let uri: string;
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "local_prod") {
    uri = config.get("mongoURI");
    logger.info("Connecting to prod database");
  } else {
    uri = config.get("mongoURITest");
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

  return {
    PlayerModel,
    SessionModel,
    ItemModel,
    WeaponModel,
    ArmorModel,
    ConsumableModel,
  };
};

export const disconnect = () => {
  if (!database) {
    return;
  }

  Mongoose.disconnect();
};
