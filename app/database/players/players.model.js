"use strict";
exports.__esModule = true;
exports.PlayerModel = void 0;
var mongoose_1 = require("mongoose");
var players_schema_1 = require("./players.schema");
exports.PlayerModel = mongoose_1.model("player", players_schema_1["default"]);
