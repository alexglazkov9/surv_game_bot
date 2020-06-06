import { Schema } from "mongoose";
import { ItemModel } from "./items.model";

export const ItemSchema = new Schema({
    name: String,
});
