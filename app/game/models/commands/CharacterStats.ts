import { IPlayer, IPlayerDocument } from "../../../database/players/players.types";
import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../CallbackData";
import { CallbackActions } from "../../misc/CallbackConstants";
import { bot } from "../../../app";

export class CharacterStats {
  character: IPlayer;
  sendTo: IPlayer;

  constructor({ character, sendTo }: { character: IPlayer; sendTo: IPlayer | undefined }) {
    this.character = character;
    this.sendTo = sendTo ?? this.character;
  }

  send = async () => {
    // Generating buttons
    const inlineKeyboardNav: TelegramBot.InlineKeyboardButton[] = [];
    const callbackData = new CallbackData({
      action: CallbackActions.PLAYER_STATS_NAV,
      telegram_id: this.sendTo.telegram_id,
      payload: CallbackActions.PLAYERS_STATS_CLOSE,
    });
    const data = callbackData.toJson();
    inlineKeyboardNav.push({
      text: "❌CLOSE",
      callback_data: data,
    });
    const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [];
    inlineKeyboard.push(inlineKeyboardNav);

    // Generating and sending message
    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    };

    const messageSent = await bot.sendMessage(
      this.sendTo.private_chat_id,
      this.getStatsFormatted(),
      opts
    );

    // Setting up callback listener to handle CLOSE
    const onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
      if (messageSent.message_id !== callbackQuery.message?.message_id) {
        return;
      }
      const action = callbackQuery.data ?? " ";
      const senderId = callbackQuery.from.id;

      if (action[0] === "{") {
        const cbData = CallbackData.fromJson(action);
        if (cbData.telegramId === senderId && cbData.action === CallbackActions.PLAYER_STATS_NAV) {
          if (cbData.payload === CallbackActions.PLAYERS_STATS_CLOSE) {
            bot.deleteMessage(
              callbackQuery.message.chat.id,
              callbackQuery.message.message_id.toString()
            );
            bot.removeListener("callback_query", onCallbackQuery);
          }
        }
      }
    };

    bot.on("callback_query", onCallbackQuery);
  };

  getStatsFormatted = () => {
    const characterDoc = this.character as IPlayerDocument;
    const equipedWeapon = characterDoc.getEquipedWeapon();
    const equipedArmor = characterDoc.getEquipedArmor();

    const statsString = `<b>${characterDoc.name}</b> - ${characterDoc.level} lvl ${
      this.character.health_points <= 0 ? "💀DEAD💀" : ""
    }\n
     💚HP: ${characterDoc.health_points.toFixed(1)}\\${characterDoc.getMaxHP().toFixed(1)}
     🗡Damage: ${characterDoc.getDamage().toFixed(0)}
     🛡Armor: ${characterDoc.getArmor().toFixed(0)}

     ❇Exp: ${characterDoc.experience.toFixed(1)}\\${characterDoc.getExpCap().toFixed(0)}

     Stamina: ${characterDoc.getStamina().toFixed(0)}
     Agility: ${characterDoc.getAgility().toFixed(0)}
     Strength: ${characterDoc.getStrength()}

     Crit Chance: ${(characterDoc.getCritChance() * 100).toFixed(2)}%
     Dodge Chance: ${(characterDoc.getDodgeChance() * 100).toFixed(2)}%
     Attack Speed: ${characterDoc.getAttackSpeed().toFixed(0)}

     💰Cash: ${characterDoc.money.toFixed(2)}

     <b>Items equiped</b>
     Armor: 
     Weapon: 
    `;
    return statsString;
  };
}
