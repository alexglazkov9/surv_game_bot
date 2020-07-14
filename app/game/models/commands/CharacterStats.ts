import { IPlayer, IPlayerDocument } from "../../../database/players/players.types";
import TelegramBot from "node-telegram-bot-api";
import { CallbackData } from "../CallbackData";
import { CallbackActions } from "../../misc/CallbackConstants";
import { bot } from "../../../app";
import { IndicatorsEmojis } from "../../misc/IndicatorsEmojis";
import { IArmor } from "../../../database/items/items.types";
import { ArmorTypes } from "../../misc/ArmorTypes";

export class CharacterStats {
  character: IPlayer;
  sendTo: IPlayer;

  constructor({ character, sendTo }: { character: IPlayer; sendTo: IPlayer | undefined }) {
    this.character = character;
    this.sendTo = sendTo ?? this.character;
  }

  send = async () => {
    // Generating and sending message
    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: this.generateLayout(),
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

      const cbData = CallbackData.fromJson(action);
      if (cbData.telegramId !== senderId) {
        return;
      }

      switch (cbData.action) {
        case CallbackActions.PLAYER_STATS_NAV: {
          if (cbData.payload === CallbackActions.PLAYERS_STATS_CLOSE) {
            bot.deleteMessage(
              callbackQuery.message.chat.id,
              callbackQuery.message.message_id.toString()
            );
            bot.removeListener("callback_query", onCallbackQuery);
            return;
          }
          break;
        }
        case CallbackActions.PLAYER_STAT_SPEND:
          {
            switch (cbData.payload) {
              case "Stamina": {
                this.character.stat_points--;
                this.character.stamina++;

                await (this.character as IPlayerDocument).saveWithRetries();
                break;
              }
              case "Agility": {
                this.character.stat_points--;
                this.character.agility++;

                await (this.character as IPlayerDocument).saveWithRetries();
                break;
              }
              case "Strength": {
                this.character.stat_points--;
                this.character.strength++;

                await (this.character as IPlayerDocument).saveWithRetries();
                break;
              }
            }
          }

          const editOpts: TelegramBot.EditMessageTextOptions = {
            parse_mode: "HTML",
            chat_id: messageSent.chat.id,
            message_id: messageSent.message_id,
            reply_markup: {
              inline_keyboard: this.generateLayout(),
            },
          };

          bot.editMessageText(this.getStatsFormatted(), editOpts);
      }
    };

    bot.on("callback_query", onCallbackQuery);
  };

  generateLayout = () => {
    // Generating buttons
    const inlineKeyboardStats: TelegramBot.InlineKeyboardButton[] = [];
    if (this.character.telegram_id === this.sendTo.telegram_id && this.character.stat_points > 0) {
      let cbStatData = new CallbackData({
        action: CallbackActions.PLAYER_STAT_SPEND,
        telegram_id: this.sendTo.telegram_id,
        payload: "Stamina",
      });
      let dataStat = cbStatData.toJson();
      inlineKeyboardStats.push({
        text: `${IndicatorsEmojis.STAMINA}STM`,
        callback_data: dataStat,
      });

      cbStatData = new CallbackData({
        action: CallbackActions.PLAYER_STAT_SPEND,
        telegram_id: this.sendTo.telegram_id,
        payload: "Agility",
      });
      dataStat = cbStatData.toJson();
      inlineKeyboardStats.push({
        text: `${IndicatorsEmojis.AGILITY}AGI`,
        callback_data: dataStat,
      });

      cbStatData = new CallbackData({
        action: CallbackActions.PLAYER_STAT_SPEND,
        telegram_id: this.sendTo.telegram_id,
        payload: "Strength",
      });
      dataStat = cbStatData.toJson();
      inlineKeyboardStats.push({
        text: `${IndicatorsEmojis.STRENGTH}STR`,
        callback_data: dataStat,
      });
    }
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
    inlineKeyboard.push(inlineKeyboardStats);
    inlineKeyboard.push(inlineKeyboardNav);

    return inlineKeyboard;
  };

  getStatsFormatted = () => {
    const characterDoc = this.character as IPlayerDocument;
    const equipment = this.getEquipmentFormatted();
    const statsString = `<b>${characterDoc.name}</b> - ${characterDoc.level} lvl ${
      this.character.health_points <= 0 ? "💀DEAD💀" : ""
    }\n
    ${IndicatorsEmojis.HEALTH_POINTS}HP: ${characterDoc.health_points.toFixed(
      1
    )}\\${characterDoc.getMaxHP().toFixed(1)}
    ${IndicatorsEmojis.DAMAGE}Damage: ${characterDoc.getDamage().toFixed(2)}
    ${IndicatorsEmojis.ARMOR}Armor: ${characterDoc.getArmor().toFixed(2)}

    ${IndicatorsEmojis.EXPERIENCE}Exp: ${characterDoc.experience.toFixed(
      1
    )}\\${characterDoc.getExpCap().toFixed(0)}

    ${IndicatorsEmojis.STAMINA}Stamina: ${characterDoc.getStamina().toFixed(2)}
    ${IndicatorsEmojis.AGILITY}Agility: ${characterDoc.getAgility().toFixed(2)}
    ${IndicatorsEmojis.STRENGTH}Strength: ${characterDoc.getStrength().toFixed(2)}

    ${IndicatorsEmojis.CRIT_CHANCE}Crit Chance: ${(characterDoc.getCritChance() * 100).toFixed(2)}%
    ${IndicatorsEmojis.CRIT_POWER}Crit Power: ${(characterDoc.getCritMultiplier() * 100).toFixed(
      2
    )}%
    ${IndicatorsEmojis.DODGE_CHANCE}Dodge Chance: ${(characterDoc.getDodgeChance() * 100).toFixed(
      2
    )}%
    ${IndicatorsEmojis.ATTACK_SPEED}Attack Speed: ${characterDoc.getAttackSpeed().toFixed(2)} (${(
      characterDoc.getAttackSpeed(true) * 100
    ).toFixed(2)}%)
    ${IndicatorsEmojis.HP_REGEN}HP Regeneration: ${(characterDoc.getHPRegeneration() * 100).toFixed(
      2
    )}% per minute

    ${IndicatorsEmojis.MONEY}Money: ${characterDoc.money.toFixed(2)} <b>${
      IndicatorsEmojis.CURRENCY_MONEY
    }</b>
    ${equipment}

    ${characterDoc.stat_points !== 0 ? `Stat Points Available: ${characterDoc.stat_points}` : ""}
    `;
    return statsString;
  };

  getEquipmentFormatted = () => {
    let equipmentString = "\n<b>EQUIPMENT</b>\n";
    const equipment = (this.character as IPlayerDocument).getAllEquipment();

    //WEAPON
    const weapon = (this.character as IPlayerDocument).getEquipedWeapon();
    equipmentString += `\n${IndicatorsEmojis.WEAPON_EQUIPPED}WEAPON: ${
      weapon ? weapon.name + `(${weapon.quality})` : "-"
    }`;
    // HEAD
    const head = equipment.find((item) => item.type === ArmorTypes.HEAD);
    equipmentString += `\n${IndicatorsEmojis.HEAD_EQUIPPED}HEAD: ${
      head ? head.name + `(${head.quality})` : "-"
    }`;
    // NECKLACE
    const necklace = equipment.find((item) => item.type === ArmorTypes.NECKLACE);
    equipmentString += `\n${IndicatorsEmojis.NECKLACE_EQUIPPED}NECKLACE: ${
      necklace ? necklace.name + `(${necklace.quality})` : "-"
    }`;
    // BODY
    const body = equipment.find((item) => item.type === ArmorTypes.BODY);
    equipmentString += `\n${IndicatorsEmojis.BODY_EQUIPPED}BODY: ${
      body ? body.name + `(${body.quality})` : "-"
    }`;
    // HANDS
    const hands = equipment.find((item) => item.type === ArmorTypes.HANDS);
    equipmentString += `\n${IndicatorsEmojis.HANDS_EQUIPPED}HANDS: ${
      hands ? hands.name + `(${hands.quality})` : "-"
    }`;
    // RINGS
    const rings = equipment.find((item) => item.type === ArmorTypes.RINGS);
    equipmentString += `\n${IndicatorsEmojis.RING_EQUIPPED}RING: ${
      rings ? rings.name + `(${rings.quality})` : "-"
    }`;
    // LEGS
    const legs = equipment.find((item) => item.type === ArmorTypes.LEGS);
    equipmentString += `\n${IndicatorsEmojis.LEGS_EQUIPPED}LEGS: ${
      legs ? legs.name + `(${legs.quality})` : "-"
    }`;
    // FEET
    const feet = equipment.find((item) => item.type === ArmorTypes.FEET);
    equipmentString += `\n${IndicatorsEmojis.FEET_EQUIPPED}FEET: ${
      feet ? feet.name + `(${feet.quality})` : "-"
    }`;

    return equipmentString;
  };
}
