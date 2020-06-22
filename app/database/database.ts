import * as Mongoose from "mongoose";
import * as config from "config";
import { PlayerModel } from "./players/players.model";
import { SessionModel } from "./sessions/sessions.model";
import { ItemModel, WeaponModel, ConsumableModel, ArmorModel } from "./items/items.model";

let database: Mongoose.Connection;

export const connect = () => {
    const uri: string = config.get("mongoURI");

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
        console.log("Connected to database");
    });

    database.on("error", () => {
        console.log("Error connecting to database");
    });

    return {
        PlayerModel,
        SessionModel,
        ItemModel,
        WeaponModel,
        ArmorModel,
        ConsumableModel,
    };
}

export const disconnect = () => {
    if (!database) {
        return;
    }

    Mongoose.disconnect();
}