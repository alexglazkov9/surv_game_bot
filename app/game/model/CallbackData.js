"use strict";
exports.__esModule = true;
exports.CallbackData = void 0;
var CallbackData = /** @class */ (function () {
    function CallbackData(_a) {
        var action = _a.action, _b = _a.telegram_id, telegram_id = _b === void 0 ? undefined : _b, _c = _a.payload, payload = _c === void 0 ? undefined : _c;
        this.action = action;
        this.telegram_id = telegram_id;
        this.payload = payload;
    }
    CallbackData.prototype.toJson = function () {
        var json = { a: this.action, t_id: this.telegram_id, p: this.payload };
        return JSON.stringify(json);
    };
    CallbackData.fromJson = function (json) {
        //TO-DO: try and catch
        var callbackData;
        if (json != undefined) {
            var jsonParsed = JSON.parse(json);
            callbackData = new CallbackData({ action: jsonParsed.a, telegram_id: jsonParsed.t_id, payload: jsonParsed.p });
        }
        else {
            callbackData = new CallbackData({ action: '', telegram_id: undefined, payload: undefined });
        }
        return callbackData;
    };
    CallbackData.createEmpty = function () {
        return new CallbackData({ action: 'ignore', telegram_id: undefined, payload: '' });
    };
    return CallbackData;
}());
exports.CallbackData = CallbackData;
