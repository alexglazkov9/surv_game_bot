import { IUserModel, IUserDocument } from "./users.types";
import { UserModel } from "./users.model";

export async function createOrUpdateUser(
  this: IUserModel,
  telegramId: number,
  defaultChatId: number
): Promise<IUserDocument> {
  let user = await UserModel.findOne({ telegram_id: telegramId });
  if (user) {
    user.default_chat_id = defaultChatId;
    user.save();
  } else {
    user = new UserModel({ telegram_id: telegramId, default_chat_id: defaultChatId });
    user = await this.create(user);
  }

  return user;
}

// export async function sessionExists(
//   this: ISessionModel,
//   { chat_id }: { chat_id: number | undefined }
// ): Promise<boolean> {
//   const exists = await this.exists({ chat_id });
//   return exists;
// }

// export async function getByChatId(
//   this: ISessionModel,
//   { chat_id }: { chat_id: number | undefined }
// ): Promise<ISessionDocument | null> {
//   const session = await this.findOne({ chat_id });
//   return session;
// }

// export async function getAll(this: ISessionModel): Promise<ISessionDocument[]> {
//   const sessions = await this.find({});
//   return sessions;
// }
