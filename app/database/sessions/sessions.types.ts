import { Document, Model } from "mongoose";

export interface ISession {
    chat_id: number,
    spawner_timer_id: number,
}

export interface ISessionDocument extends ISession, Document { }

export interface ISessionModel extends Model<ISessionDocument> {
    createNewSession: (
        this: ISessionModel,
        chat_id: number | undefined,
    ) => Promise<ISessionDocument>;

    getByChatId: (
        this: ISessionModel,
        {
            chat_id,
        }: { chat_id: number | undefined, }
    ) => Promise<ISessionDocument | null>;

    getAll: (
        this: ISessionModel,
    ) => Promise<ISessionDocument[]>;

    sessionExists: (
        this: ISessionModel,
        {
            chat_id,
        }: { chat_id: number | undefined, }
    ) => Promise<boolean>;
}