import { GameInstance } from "./GameInstance";
import TelegramBot = require("node-telegram-bot-api");
import { SessionModel } from "../../database/sessions/sessions.model";
import { logger } from "../../utils/logger";
import { Shop } from "./commands/Shop";
import { Inventory } from "./commands/Inventory";
import { CallbackData } from "./CallbackData";
import { CallbackActions } from "../misc/CallbackConstants";
import { UserModel } from "../../database/users/users.model";
import { IPlayerDocument, IPlayer } from "../../database/players/players.types";
import { BotCommands } from "../misc/BotCommands";
import { CharacterStats } from "./commands/CharacterStats";
import { CharacterPool } from "./CharacterPool";
import {
  ShopItemModel,
  ShopWeaponModel,
  WeaponModel,
  ShopArmorModel,
  ArmorModel,
} from "../../database/items/items.model";
import { getRandomInt } from "../../utils/utils";
import { IWeaponDocument, IArmorDocument, IArmor, IWeapon } from "../../database/items/items.types";
import { Mongoose, mongo, Types } from "mongoose";
import cron = require("node-cron");
import { Character } from "./units/Character";
import { PlayerModel } from "../../database/players/players.model";

const AUTO_DELETE_DELAY = 5000;

export class GameManager {
  gameInstances: { [id: number]: GameInstance };
  private bot: TelegramBot;

  constructor({ bot }: { bot: TelegramBot }) {
    this.gameInstances = {};
    this.bot = bot;
  }

  launch = async () => {
    logger.info("GameManager starting...");
    await CharacterPool.getInstance().init();

    // Refreshes items in the shop every 24hr
    this.setUpShopRefresher();

    this.setUpCommandsHandlers();

    const sessions = await SessionModel.getAll();
    sessions.forEach((session) => {
      logger.info(`Starting session for chat_id = ${session.chat_id}`);
      this.gameInstances[session.chat_id] = new GameInstance({
        chat_id: session.chat_id,
        bot: this.bot,
      });
      this.gameInstances[session.chat_id].start();
    });
  };

  setUpCommandsHandlers = () => {
    this.bot.onText(/\/start_game@?[A-z]*/, this.startGame);

    this.bot.onText(/^\/reg@?[A-z]* ?(.*)/, this.reg);

    this.bot.onText(/^\/character@?[A-z]* ?[A-z0-9]*/, (msg) =>
      this.privateChatCmdHandler(msg, BotCommands.CHARACTER)
    );

    this.bot.onText(/^\/inventory@?[A-z]*/, (msg) =>
      this.privateChatCmdHandler(msg, BotCommands.INVENTORY)
    );

    this.bot.onText(/\/shop@?[A-z]*/, (msg) => this.privateChatCmdHandler(msg, BotCommands.SHOP));

    this.bot.onText(/\/help@?[A-z]*/, this.help);

    this.bot.onText(/\/duel@?[A-z]* ?([0-9]*)/, (msg) =>
      this.privateChatCmdHandler(msg, BotCommands.DUEL)
    );

    this.bot.onText(/\/start@?[A-z]*/, this.start);

    // ADMIN COMMANDS

    this.bot.onText(/\/spawn_enemy/, this.spawnEnemy);

    this.bot.onText(/\/respawn/, this.respawn);

    this.bot.onText(/\/refresh_shop/, this.refreshShop);
  };

  spawnEnemy = async (msg: TelegramBot.Message) => {
    logger.debug("Spawn enemy called explicitly");
    if (msg.chat.id !== -1001163373375 && msg.chat.id !== -1001429535244) {
      this.bot.sendMessage(msg.chat.id, "No cheating here, fag");
      return;
    }
    this.gameInstances[msg.chat.id]?.spawnEnemy(true);
  };

  respawn = async (msg: TelegramBot.Message) => {
    if (msg.chat.id !== -1001163373375 && msg.chat.id !== -1001429535244) {
      this.bot.sendMessage(msg.chat.id, "No cheating here, fag");
      return;
    }
    const characters = CharacterPool.getInstance().getAllFromChat({
      chatId: msg.chat.id,
      alive: false,
    });
    characters?.forEach((character) => {
      character._doc.revive();
    });
  };

  requestToStart = async (msg: TelegramBot.Message) => {
    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "HTML",
    };

    const text = `Start a chat with <a href="tg://user?id=${
      (await this.bot.getMe()).id
    }">bot</a> and enter /start`;
    const message = await this.bot.sendMessage(msg.chat.id, text, opts);

    // Delete message after delay
    setTimeout(() => {
      this.bot.deleteMessage(message.chat.id, message.message_id.toString());
    }, AUTO_DELETE_DELAY);
  };

  privateChatCmdHandler = async (msg: TelegramBot.Message, cmd: string) => {
    let character: Character | undefined;

    if (msg.chat.type === "private") {
      // Message received from private chat

      // Lookup user
      const user = await UserModel.findOne({ telegram_id: msg.from?.id });

      // Redirect player to private chat if user doesn't exist
      if (!user) {
        this.requestToStart(msg);
        return;
      }

      // Lookup user's deafult character
      character = CharacterPool.getInstance().getOne({
        chatId: user.default_chat_id,
        telegramId: msg.from?.id,
      });

      if (character === undefined) {
        return;
      }
    } else {
      // Message received from group chat

      // Delete message with command
      this.bot.deleteMessage(msg.chat.id, msg.message_id.toString());

      // Lookup user's deafult character
      character = CharacterPool.getInstance().getOne({
        chatId: msg.chat.id,
        telegramId: msg.from?.id,
      });

      if (character === undefined) {
        return;
      }

      if (character && character._doc.private_chat_id === undefined) {
        this.requestToStart(msg);
        return;
      }
    }

    switch (cmd) {
      case BotCommands.SHOP: {
        this.shop(character._doc);
        break;
      }
      case BotCommands.INVENTORY: {
        this.inventory(character._doc);
        break;
      }
      case BotCommands.DUEL: {
        if (this.gameInstances[msg.chat.id]?.isBattleInProgress()) {
          this.bot.sendMessage(
            character._doc.private_chat_id,
            "Cannot start duel while another battle is in progress"
          );
          return;
        }

        if (!character.isAlive()) {
          this.bot.sendMessage(character._doc.private_chat_id, "Can't start duel while DEAD.");
          return;
        }

        const args = msg.text?.split(" ");
        if (args && args[1] && Number.parseInt(args[1], 10)) {
          const wager = Number.parseInt(args[1], 10);

          if (character._doc.money < wager) {
            this.bot.sendMessage(
              character._doc.private_chat_id,
              "You don't have enough money to start duel"
            );
            return;
          }
          this.duel(character._doc, wager);
        } else {
          this.bot.sendMessage(character._doc.private_chat_id, "Usage: /duel <number>");
          return;
        }

        break;
      }
      case BotCommands.CHARACTER: {
        const args = msg.text?.split(" ");
        if (args && args[1] !== undefined) {
          // Inspecting other character
          const inspectedCharacter = CharacterPool.getInstance().getByName({ name: args[1] });
          if (inspectedCharacter != null) {
            this.character(inspectedCharacter._doc, character._doc);
          } else {
            const opts: TelegramBot.SendMessageOptions = {
              parse_mode: "HTML",
            };
            const message = await this.bot.sendMessage(
              character._doc.private_chat_id,
              `Character with the name '${args[1]}' doesn't exist`,
              opts
            );
          }
        } else {
          // Inspecting self
          this.character(character._doc);
        }
        break;
      }
    }
  };

  start = async (msg: TelegramBot.Message) => {
    if (msg.chat.type === "private") {
      const inlineKeyboard: TelegramBot.InlineKeyboardButton[][] = [];
      let row = 0;
      let index = 0;

      // Links private chat id to player's characters
      const characters = CharacterPool.getInstance().get({ telegramId: msg.from?.id });
      for (const character of characters) {
        character._doc.private_chat_id = msg.chat.id;
        await character._doc.saveWithRetries();

        const cbData = new CallbackData({
          action: CallbackActions.START_CHARACTER_PICKED,
          telegram_id: msg.from?.id,
          payload: character.getName(),
        });
        const cbDataJson = cbData.toJson();
        if (inlineKeyboard[row] === undefined) {
          inlineKeyboard[row] = [];
        }
        inlineKeyboard[row].push({
          text: `${character.getName()} - ${character.level} lvl`,
          callback_data: cbDataJson,
        });
        index++;
        if (index % 2 === 0) {
          row++;
        }
      }

      const text = "What character do you want to set as default?\n";
      const opts: TelegramBot.SendMessageOptions = {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      };
      const message = await this.bot.sendMessage(msg.chat.id, text, opts);

      const onQueryCallback = async (callbackQuery: TelegramBot.CallbackQuery) => {
        const data = CallbackData.fromJson(callbackQuery.data);

        if (
          message.message_id !== callbackQuery.message?.message_id ||
          data.telegramId !== callbackQuery.from.id
        ) {
          return;
        }

        const characterName = data.payload;
        switch (data.action) {
          // Player clicked on any item
          case CallbackActions.START_CHARACTER_PICKED: {
            const character = CharacterPool.getInstance().getByName({ name: characterName });
            if (character) {
              await UserModel.createOrUpdateUser(data.telegramId, character.getChatId());
            }
            break;
          }
        }

        const optsEdit: TelegramBot.EditMessageTextOptions = {
          chat_id: message.chat.id,
          message_id: message.message_id,
          parse_mode: "HTML",
        };
        this.bot.editMessageText(
          `<b>${characterName}</b> has been selected as your default character! /start to select another one`,
          optsEdit
        );

        this.bot.removeListener("callback_query", onQueryCallback);
      };

      this.bot.on("callback_query", onQueryCallback);
    }
  };

  shop = async (character: IPlayer) => {
    const shop = new Shop({ player: character });
    shop.display();
  };

  inventory = (character: IPlayerDocument) => {
    const inventory = new Inventory({
      character,
    });
    inventory.display();
  };

  character = async (character: IPlayer, sendTo?: IPlayer) => {
    const characterStats = new CharacterStats({ character, sendTo });
    characterStats.send();
    return;
  };

  reg = async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
    if (match && match[1]) {
      const opts: TelegramBot.SendMessageOptions = {
        parse_mode: "HTML",
        reply_to_message_id: msg.message_id,
      };

      const playerExists = CharacterPool.getInstance().exists({
        telegramId: msg.from?.id,
        chatId: msg.chat.id,
      });

      if (playerExists) {
        this.bot.sendMessage(msg.chat.id, `You are already in the game.`, opts);
        return;
      }

      const nickname = match[1].toString();
      if (
        nickname.length < 3 ||
        nickname.length > 15 ||
        nickname.includes(" ") ||
        nickname.includes("@") ||
        nickname.includes("<") ||
        nickname.includes(">")
      ) {
        this.bot.sendMessage(
          msg.chat.id,
          `Nickname must be between 3 and 15 characters long. nickname can't include spaces`,
          opts
        );
        return;
      }

      const isNameTaken = CharacterPool.getInstance().isNameTaken({ name: nickname });

      if (isNameTaken) {
        this.bot.sendMessage(msg.chat.id, `Nickname "${nickname}" is already taken.`, opts);
      } else {
        if (msg.from?.id !== undefined) {
          const player = await CharacterPool.getInstance().create({
            telegramId: msg.from.id,
            chatId: msg.chat.id,
            name: nickname,
          });
          if (player) {
            this.bot.sendMessage(msg.chat.id, `Welcome to the game ${player.getName()}`, opts);
          } else {
            this.bot.sendMessage(msg.chat.id, `Something went wrong`, opts);
          }
        }
      }
    } else {
      this.bot.sendMessage(msg.chat.id, "Usage: /reg <username>");
    }
  };

  startGame = async (msg: TelegramBot.Message) => {
    const opts = {
      reply_to_message_id: msg.message_id,
    };

    const sessionsExists = await SessionModel.sessionExists({ chat_id: msg.chat.id });

    if (sessionsExists) {
      this.bot.sendMessage(msg.chat.id, "Game is running!", opts);
    } else {
      const session = await SessionModel.createNewSession(msg.chat.id);
      if (session) {
        this.bot.sendMessage(msg.chat.id, "WELCOME! Games is starting now!", opts);
        this.gameInstances[msg.chat.id] = new GameInstance({
          chat_id: session.chat_id,
          bot: this.bot,
        });
        this.gameInstances[msg.chat.id].start();
      } else {
        this.bot.sendMessage(msg.chat.id, "Something went wrong", opts);
      }
    }
  };

  help = async (msg: TelegramBot.Message) => {
    const message = `Available commands:
      \n/reg <username> - register a username to start playing
      \n/character - information about your character
      \n/character <username> - information about another character
      \n/inventory - check, equip and unequip items
      \n/shop - buy armor and weapons`;

    this.bot.sendMessage(msg.chat.id, message, {
      disable_notification: true,
    });
  };

  duel = async (charcaterDoc: IPlayerDocument, wager: number) => {
    this.gameInstances[charcaterDoc.chat_id]?.startDuel(new Character(charcaterDoc), wager);
  };

  setUpShopRefresher = () => {
    cron.schedule(
      "0 1 * * *",
      () => {
        this.refreshShop();
      },
      {
        scheduled: true,
        timezone: "America/Sao_Paulo",
      }
    );
  };

  refreshShop = async () => {
    // Weapon
    await ShopWeaponModel.deleteMany({});
    const weaponCount = await WeaponModel.countDocuments({}).exec();
    const weapons: IWeapon[] = [];
    let i = 0;
    do {
      const weapon = await WeaponModel.findOne({}).skip(getRandomInt(0, weaponCount));
      if (weapon !== null && !weapons.includes(weapon)) {
        let newWeapon = new ShopWeaponModel(weapon);
        newWeapon._id = Types.ObjectId();
        newWeapon.isNew = true;
        await ShopWeaponModel.create(newWeapon);
        i++;
      }
    } while (i < 5);

    //Armor
    await ShopArmorModel.deleteMany({});
    const armorCount = await ArmorModel.countDocuments({}).exec();
    const armors: IArmor[] = [];
    i = 0;
    do {
      const armor = await ArmorModel.findOne({}).skip(getRandomInt(0, armorCount));
      if (armor !== null && !armors.includes(armor)) {
        let newArmor = new ShopArmorModel(armor);
        newArmor._id = Types.ObjectId();
        newArmor.isNew = true;
        await ShopArmorModel.create(newArmor);
        i++;
      }
    } while (i < 5);
  };
}
