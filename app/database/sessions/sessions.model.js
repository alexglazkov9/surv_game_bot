"use strict";
exports.__esModule = true;
exports.SessionModel = void 0;
var mongoose_1 = require("mongoose");
var sessions_schema_1 = require("./sessions.schema");
exports.SessionModel = mongoose_1.model("session", sessions_schema_1["default"]);
