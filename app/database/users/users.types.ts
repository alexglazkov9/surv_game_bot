import { Document, Model } from "mongoose";

export interface IUser {
  telegram_id: number;
  default_chat_id: number;
}

export interface IUserDocument extends IUser, Document {}

export interface IUserModel extends Model<IUserDocument> {
  createOrUpdateUser: (
    this: IUserModel,
    telegramId: number,
    defaultChatId: number
  ) => Promise<IUserDocument>;
}
