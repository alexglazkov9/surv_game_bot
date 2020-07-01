import { Schema } from "mongoose";
import { createOrUpdateUser } from "./users.statics";

const UserSchema = new Schema({
  telegram_id: Number,
  default_chat_id: Number,
});

UserSchema.statics.createOrUpdateUser = createOrUpdateUser;

export default UserSchema;
