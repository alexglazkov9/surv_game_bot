export class CallbackData {
  action: string;
  telegramId: number | undefined;
  payload: any | undefined;

  constructor({
    action,
    telegram_id,
    payload,
  }: {
    action: string;
    telegram_id: number | undefined;
    payload: any | undefined;
  }) {
    this.action = action;
    this.telegramId = telegram_id;
    this.payload = payload;
  }

  toJson(): string {
    const json = { a: this.action, t_id: this.telegramId, p: this.payload };
    return JSON.stringify(json);
  }

  static fromJson(json: string | undefined): CallbackData {
    // TO-DO: try and catch
    let callbackData;
    if (json !== undefined) {
      const jsonParsed = JSON.parse(json);

      callbackData = new CallbackData({
        action: jsonParsed.a,
        telegram_id: jsonParsed.t_id,
        payload: jsonParsed.p,
      });
    } else {
      callbackData = new CallbackData({ action: "", telegram_id: undefined, payload: undefined });
    }

    return callbackData;
  }

  static createEmpty(): CallbackData {
    return new CallbackData({ action: "ignore", telegram_id: undefined, payload: "" });
  }
}
