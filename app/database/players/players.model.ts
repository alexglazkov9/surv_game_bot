import { model } from "mongoose";
import { IPlayerDocument, IPlayerModel } from "./players.types";
import PlayerSchema from "./players.schema";

export const PlayerModel = model<IPlayerDocument>("player", PlayerSchema) as IPlayerModel;
