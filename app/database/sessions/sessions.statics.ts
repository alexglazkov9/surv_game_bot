import { ISessionDocument, ISessionModel } from "./sessions.types";
import { SessionModel } from "./sessions.model";

export async function createNewSession(
  this: ISessionModel,
  chatId: number
): Promise<ISessionDocument> {
  let session = new SessionModel({ chat_id: chatId });
  console.log(chatId);
  session = await this.create(session);
  return session;
}

export async function sessionExists(
  this: ISessionModel,
  { chat_id }: { chat_id: number | undefined }
): Promise<boolean> {
  const exists = await this.exists({ chat_id });
  return exists;
}

export async function getByChatId(
  this: ISessionModel,
  { chat_id }: { chat_id: number | undefined }
): Promise<ISessionDocument | null> {
  const session = await this.findOne({ chat_id });
  return session;
}

export async function getAll(this: ISessionModel): Promise<ISessionDocument[]> {
  const sessions = await this.find({});
  return sessions;
}
