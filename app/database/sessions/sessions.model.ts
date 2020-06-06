import { model } from "mongoose";
import { ISessionDocument, ISessionModel } from "./sessions.types";
import SessionSchema from "./sessions.schema";

export const SessionModel = model<ISessionDocument>("session", SessionSchema) as ISessionModel;