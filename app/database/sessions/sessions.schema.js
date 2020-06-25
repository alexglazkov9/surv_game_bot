"use strict";
exports.__esModule = true;
var mongoose_1 = require("mongoose");
var sessions_statics_1 = require("./sessions.statics");
var SessionSchema = new mongoose_1.Schema({
    chat_id: Number,
    spawner_timer_id: Number
});
SessionSchema.statics.getAll = sessions_statics_1.getAll;
SessionSchema.statics.createNewSession = sessions_statics_1.createNewSession;
SessionSchema.statics.sessionExists = sessions_statics_1.sessionExists;
SessionSchema.statics.getByChatId = sessions_statics_1.getByChatId;
exports["default"] = SessionSchema;
