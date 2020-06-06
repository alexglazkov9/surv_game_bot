import { Schema } from "mongoose";
import { getAll, createNewSession, sessionExists, getByChatId } from "./sessions.statics";

const SessionSchema = new Schema({
    chat_id: Number,
    spawner_timer_id: Number,
});

SessionSchema.statics.getAll = getAll;
SessionSchema.statics.createNewSession = createNewSession;
SessionSchema.statics.sessionExists = sessionExists;
SessionSchema.statics.getByChatId = getByChatId;

export default SessionSchema;