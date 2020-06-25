"use strict";
exports.__esModule = true;
exports.CallbackActions = void 0;
var CallbackActions = /** @class */ (function () {
    function CallbackActions() {
    }
    CallbackActions.JOIN_FIGHT = 'join_fight';
    //PLAYER STATS
    CallbackActions.PLAYER_STATS_NAV = 'statsnav';
    CallbackActions.PLAYERS_STATS_CLOSE = 'statsclose';
    //INVENTORY
    CallbackActions.INVENTORY = 'inv';
    CallbackActions.INVENTORY_NAV = 'invnav';
    CallbackActions.INVENTORY_NAV_PREV = 'invnav_prev';
    CallbackActions.INVENTORY_NAV_NEXT = 'invnav_next';
    CallbackActions.INVENTORY_NAV_CLOSE = 'invnav_close';
    //SHOP
    CallbackActions.SHOP = 'shop';
    CallbackActions.SHOP_NAV = 'shopnav';
    CallbackActions.SHOP_NAV_PREV = 'shop_nav_prev';
    CallbackActions.SHOP_NAV_NEXT = 'shop_nav_next';
    CallbackActions.SHOP_NAV_CLOSE = 'shop_nav_close';
    CallbackActions.SHOP_BUY = 'shop_buy';
    return CallbackActions;
}());
exports.CallbackActions = CallbackActions;
