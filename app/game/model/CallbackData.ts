export class CallbackData {
    action: string;
    telegram_id: number | undefined;
    payload: any | undefined;

    constructor({ action, telegram_id = undefined, payload = undefined }: { action: string, telegram_id: number | undefined, payload: any | undefined }) {
        this.action = action;
        this.telegram_id = telegram_id;
        this.payload = payload;
    }

    toJson(): string {
        let json = { a: this.action, t_id: this.telegram_id, p: this.payload };
        return JSON.stringify(json);
    }

    static fromJson(json: string | undefined): CallbackData {
        //TO-DO: try and catch
        let callbackData;
        if (json != undefined) {
            let jsonParsed = JSON.parse(json);

            callbackData = new CallbackData({ action: jsonParsed.a, telegram_id: jsonParsed.t_id, payload: jsonParsed.p });
        } else {
            callbackData = new CallbackData({ action: '', telegram_id: undefined, payload: undefined });
        }

        return callbackData;
    }
}