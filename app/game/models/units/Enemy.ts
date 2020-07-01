import EventEmitter = require("events");
import { IPlayerDocument } from "../../../database/players/players.types";
import { getRandomInt } from "../../../utils/utils";
import { CallbackData } from "../CallbackData";
import TelegramBot = require("node-telegram-bot-api");
import { CallbackActions } from "../../misc/CallbackConstants";
import { logger } from "../../../utils/logger";
import { PlayerModel } from "../../../database/players/players.model";
import { IUnit } from "./IUnit";
import { BattleEvents } from "../battle/BattleEvents";
import { INPCUnit } from "./INPCUnit";

const UPDATE_DELAY = 5000;
const ATTACK_CHAT_EVENT = "attack_chat_event";
const ATTACK_FIGHT_EVENT = "attack_fight_event";
const ATTACK_BY_PLAYER = "attack_by_player";
const UPDATE_EVENT = "update_event";
export const ON_DEATH_EVENT = "ON_DEATH_EVENT";

export class Enemy extends EventEmitter.EventEmitter implements INPCUnit {
  id: number;
  bot: TelegramBot;
  chatId: number;
  name: string;
  level: number;
  hpMax: number;
  hp: number;
  damage: number;
  armor: number;
  tier: number;
  messageId?: number;
  expOnDeath: number;
  moneyOnDeath: number;
  combatLog: string;
  attackSpeedPreFight: number;
  attackRateInFight: number;
  attackTimer?: NodeJS.Timeout;
  attackFightTimer?: NodeJS.Timeout;
  updateTimer?: NodeJS.Timeout;
  itemDrop: string | null;
  playersFighting: IPlayerDocument[];
  attackTimersPlayers: { [id: number]: NodeJS.Timeout } = {};
  previousMessage?: string;
  preFightAttackTimer?: NodeJS.Timeout;

  constructor({
    bot,
    name,
    chat_id,
    hp = 10,
    level = 1,
    exp_on_death = 1,
    money_on_death = 0,
    damage = 1,
    armor = 0,
    tier = 1,
    attack_rate_minutes = 1 / 6,
    item_drop_chance = [],
    attack_rate_fight = 1500,
  }: {
    bot: TelegramBot;
    name: string;
    chat_id: number;
    hp: number;
    level: number;
    exp_on_death: number;
    money_on_death: number;
    damage: number;
    armor: number;
    tier: number;
    attack_rate_minutes: number;
    item_drop_chance: any[];
    attack_rate_fight: number;
  }) {
    super();

    this.id = Date.now();

    this.bot = bot;
    this.chatId = chat_id;
    this.name = name;
    this.level = level;
    this.hpMax = hp;
    this.hp = hp;
    this.expOnDeath = exp_on_death;
    this.moneyOnDeath = money_on_death;
    this.damage = damage;
    this.armor = armor;
    this.tier = tier;
    this.attackSpeedPreFight = attack_rate_minutes * 60 * 1000;
    this.attackRateInFight = attack_rate_fight;

    this.itemDrop = this.getDropItem(item_drop_chance);
    this.combatLog = "\n📜*Combat Log*\n";
    this.playersFighting = [];

    this.addListener(ATTACK_CHAT_EVENT, this.dealDamage);
    this.addListener(ATTACK_FIGHT_EVENT, this.dealDamageInFight);
    this.addListener(UPDATE_EVENT, this.sendUpdate);
  }

  // Creates enemy from json config
  static fromJson = ({
    bot,
    json,
    chat_id,
    level = 1,
  }: {
    bot: TelegramBot;
    json: any;
    chat_id: number;
    level: number;
  }) => {
    const enemy = new Enemy({
      bot,
      name: json.name,
      chat_id,
      hp: json.hp * (1 + 0.1 * level),
      level,
      armor: json.armor,
      tier: json.tier,
      exp_on_death: (level * json.hp + level * json.damage * 2) / 5,
      money_on_death: json.money_drop * (1 + 0.1 * level),
      damage: json.damage * (1 + 0.1 * level),
      attack_rate_minutes: json.attack_rate_minutes,
      item_drop_chance: json.item_drop ?? [],
      attack_rate_fight: json.attack_rate_fight,
    });
    return enemy;
  };

  spawn = async () => {
    this.messageId = await this.sendEnemyMessage();

    this.bot.on("callback_query", this.onCallbackQuery);

    this.attackTimer = setInterval(() => this.emit(ATTACK_CHAT_EVENT), this.attackSpeedPreFight);
    this.attackFightTimer = setInterval(
      () => this.emit(ATTACK_FIGHT_EVENT),
      this.attackRateInFight
    );
    this.updateTimer = setInterval(() => this.emit(UPDATE_EVENT), UPDATE_DELAY);

    logger.verbose(`Enemy ${this.name} spawned in ${this.chatId}`);

    // Attack as soon as enemy spawned
    this.dealDamage();
  };

  sendEnemyMessage = async (): Promise<number> => {
    const callbackData = new CallbackData({
      action: CallbackActions.JOIN_FIGHT,
      telegram_id: undefined,
      payload: this.id,
    });
    const opts: TelegramBot.SendMessageOptions = {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Join fight",
              callback_data: callbackData.toJson(),
            },
          ],
        ],
      },
    };

    const message = await this.bot.sendMessage(this.chatId, this.greeting(), opts);
    return message.message_id;
  };

  onCallbackQuery = async (callbackQuery: TelegramBot.CallbackQuery) => {
    const callbackData = CallbackData.fromJson(callbackQuery.data);

    if (callbackData.action === CallbackActions.JOIN_FIGHT) {
      const player = await await PlayerModel.findPlayer({
        telegram_id: callbackQuery.from.id,
        chat_id: this.chatId,
      });
      if (player !== undefined) {
        if (
          this.playersFighting.findIndex((pl) => {
            return pl.telegram_id === player?.telegram_id;
          }) !== -1
        ) {
          const optsCall: TelegramBot.AnswerCallbackQueryOptions = {
            callback_query_id: callbackQuery.id,
            text: "You are in the fight",
            show_alert: false,
          };
          this.bot.answerCallbackQuery(optsCall);
          return;
        } else {
          let optsCall: TelegramBot.AnswerCallbackQueryOptions;
          if (player.isAlive()) {
            // Stop auto-attacking all players
            if (this.attackTimer !== undefined) {
              clearInterval(this.attackTimer);
              this.attackTimer = undefined;
              this.combatLog += `\n⚔️FIGHT STARTED⚔️\n`;
            }
            // Add player to the list of attackers
            this.playersFighting.push(player);
            this.combatLog += `➕${player.name} has joined he fight\n`;
            logger.verbose(`Player ${player?.name} joined the fight in ${this.chatId}`);
            // Setup player attack handler
            this.addListener(ATTACK_BY_PLAYER + player.telegram_id, () =>
              this.handlePlayerAttack(player)
            );
            this.attackTimersPlayers[player.telegram_id] = setTimeout(
              () => this.emit(ATTACK_BY_PLAYER + player.telegram_id),
              player.getAttackSpeed()
            );
            optsCall = {
              callback_query_id: callbackQuery.id,
              text: "You joined the fight",
              show_alert: false,
            };
          } else {
            optsCall = {
              callback_query_id: callbackQuery.id,
              text: "You are DEAD",
              show_alert: false,
            };
          }
          this.bot.answerCallbackQuery(optsCall);
        }
      }
    }
  };

  handlePlayerAttack = async (player: IPlayerDocument) => {
    if (this.hp > 0 && player.canAttack()) {
      this.combatLog += `🔸 ${
        player.name
      }_${player.getMinStats()} deals ${player.getHitDamage().toFixed(1)} damage_\n`;
      await player.hitEnemy(this);
      logger.verbose(
        `Player ${player?.name} in ${
          this.chatId
        } attacked enemy for ${player.getHitDamage().toFixed(1)}`
      );
      this.attackTimersPlayers[player.telegram_id] = setTimeout(
        () => this.emit(ATTACK_BY_PLAYER + player.telegram_id),
        player.getAttackSpeed()
      );
    }
  };

  takeIncomingDamage = (player: IPlayerDocument) => {
    this.hp -= player.getHitDamage();
    if (this.hp <= 0) {
      this.hp = 0;
      this.combatLog += `✨${this.name} _slained by_ ${player.name}_${player.getMinStats()}\n`;

      this.despawn();
    }
  };

  dealDamageInFight = async () => {
    const rndIndex = getRandomInt(0, this.playersFighting.length);
    const player = this.playersFighting[rndIndex];
    if (player !== undefined) {
      const dmgDealt = await player.takeDamage(this.damage);
      logger.verbose(
        `Player ${player?.name} in ${this.chatId} was damaged in fight for ${dmgDealt}`
      );
      this.combatLog += `🔹 ${this.name} _deals ${dmgDealt.toFixed(1)} damage to_ ${
        player.name
      }_${player.getMinStats()}_\n`;
      if (!player.isAlive()) {
        this.combatLog += `🔹 ${this.name} _murdered_ ${player.name}_${player.getMinStats()}_\n`;

        clearInterval(this.attackTimersPlayers[player.telegram_id]);
        this.playersFighting.splice(rndIndex, 1);

        if (this.playersFighting.length === 0) {
          logger.verbose(`No more players in ${this.chatId}, leaving...`);
          this.despawn();
        }
      }
    }
  };

  dealDamage = async () => {
    const player = await PlayerModel.getRandomPlayer(this.chatId, true);
    if (player != null) {
      const dmgDealt = await player.takeDamage(this.damage);
      logger.verbose(
        `Player ${player?.name} in ${this.chatId} was randomly attacked for ${dmgDealt}`
      );

      this.combatLog += `🔹 ${this.name} _deals ${dmgDealt.toFixed(1)} damage to_ ${
        player.name
      }_${player.getMinStats()}_\n`;

      if (!player.isAlive()) {
        this.combatLog += `🔹 ${this.name} _murdered_ ${player.name}_${player.getMinStats()}_\n`;
        this.despawn();
      }
    }
  };

  buildMessageText = (): string => {
    let messageText = "";
    messageText += this.stats();
    messageText += this.combatLog;

    return messageText;
  };

  getDropItem = (itemDropChance: any[]): string | null => {
    const itemDropProbabilities: number[] = [];
    const itemDrops: string[] = [];
    let prevProbability: number = 0;
    itemDropChance.forEach((itemChance) => {
      itemDropProbabilities.push(prevProbability + itemChance.chance);
      prevProbability += itemChance.chance;
      itemDrops.push(itemChance.item_name);
    });

    const dropProbability = getRandomInt(0, 100);
    let dropType = 0;
    while (itemDropProbabilities[dropType] <= dropProbability) {
      dropType++;
    }

    if (itemDrops[dropType] === "Nothing") return null;

    return itemDrops[dropType];
  };

  greeting = (): string => {
    return `Wild *${this.name}* spawned!\n`;
  };

  stats = (): string => {
    return `
            *${this.name}* - Level ${this.level}\n
            💚 *HP*: ${this.hp.toFixed(1)}\\${this.hpMax.toFixed(1)}
            🗡 *Damage*: ${this.damage.toFixed(1)}
            `;
  };

  sendUpdate = (hideMarkup = false) => {
    const callbackData = new CallbackData({
      action: CallbackActions.JOIN_FIGHT,
      telegram_id: undefined,
      payload: this.id,
    });
    const opts: TelegramBot.EditMessageTextOptions = {
      parse_mode: "Markdown",
      chat_id: this.chatId,
      message_id: this.messageId,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Join fight",
              callback_data: callbackData.toJson(),
            },
          ],
        ],
      },
    };

    if (hideMarkup) {
      delete opts.reply_markup;
    }

    const messageText = this.buildMessageText();
    if (this.previousMessage === messageText) {
      return;
    }
    this.previousMessage = messageText;
    this.bot.editMessageText(messageText, opts);
  };

  rewardPlayers = async (): Promise<void> => {
    const rndIndex = getRandomInt(0, this.playersFighting.length);
    let player: IPlayerDocument;
    let index = 0;
    for (player of this.playersFighting) {
      player.money += this.moneyOnDeath / this.playersFighting.length;
      player.gainXP(this.expOnDeath / this.playersFighting.length);
      if (this.itemDrop != null && index === rndIndex) {
        const fightingPlayer = this.playersFighting[rndIndex];
        await fightingPlayer.addItemToInventory(this.itemDrop);
        this.combatLog += `🔮${fightingPlayer.name} picks up ${this.itemDrop}\n`;

        logger.verbose(`${fightingPlayer.name} picks up ${this.itemDrop}`);
      }
      logger.debug(`Saving player in rewardPlayers()`);
      await player.saveWithRetries();
      index++;
    }

    logger.verbose(
      `Players get: ${(this.expOnDeath / this.playersFighting.length).toFixed(1)} exp ${
        this.moneyOnDeath > 0
          ? `, ${(this.moneyOnDeath / this.playersFighting.length).toFixed(2)} money`
          : ""
      }_`
    );

    this.combatLog += `🎁Players get: ${(this.expOnDeath / this.playersFighting.length).toFixed(
      1
    )} exp ${
      this.moneyOnDeath > 0
        ? `, ${(this.moneyOnDeath / this.playersFighting.length).toFixed(2)} money`
        : ""
    }_\n`;
  };

  despawn = async (): Promise<void> => {
    logger.info(`Enemy ${this.name} is despawning...`);
    this.bot.removeListener("callback_query", this.onCallbackQuery);

    this.clearAllIntervals();

    this.removeAllListeners(ATTACK_CHAT_EVENT);
    this.removeAllListeners(ATTACK_FIGHT_EVENT);
    this.removeAllListeners(UPDATE_EVENT);

    if (this.hp <= 0) {
      await this.rewardPlayers();
    } else {
      this.combatLog += `🔹 ${this.name} _left battle_\n`;
    }

    this.sendUpdate(true);

    this.emit(ON_DEATH_EVENT);
    this.removeAllListeners(ON_DEATH_EVENT);
  };

  clearAllIntervals = (): void => {
    if (this.attackFightTimer !== undefined) {
      clearInterval(this.attackFightTimer);
    }

    if (this.attackTimer !== undefined) {
      clearInterval(this.attackTimer);
    }

    if (this.updateTimer !== undefined) {
      clearInterval(this.updateTimer);
    }

    this.playersFighting.forEach((player) => {
      clearInterval(this.attackTimersPlayers[player.telegram_id]);
    });
  };

  // Unit interface methods
  startAttacking = () => {
    if (this.attackTimer !== undefined) {
      this.stopAttacking();
    }
    this.attackTimer = setInterval(
      () => this.emit(BattleEvents.UNIT_ATTACKS),
      this.attackRateInFight
    );
  };

  startAttackingPreFight = (): void => {
    if (this.attackTimer !== undefined) {
      this.stopAttacking();
    }
    this.preFightAttackTimer = setInterval(
      () => this.emit(BattleEvents.UNIT_ATTACKS),
      this.attackSpeedPreFight
    );
  };

  stopAttacking = (): void => {
    if (this.attackTimer !== undefined) {
      clearInterval(this.attackTimer);
      this.attackTimer = undefined;
    }
  };

  attack = (target: IUnit): number => {
    const dmgDealt = target.takeDamage(this.getAttackDamage());
    return dmgDealt;
  };

  getAttackDamage = (): number => {
    return this.damage;
  };

  getAttackSpeed = (): number => {
    return this.attackRateInFight;
  };

  getName = (): string => {
    return this.name;
  };

  takeDamage = (dmg: number) => {
    dmg = dmg - this.armor;
    if (dmg < 0) {
      dmg = 0;
    }
    this.hp -= dmg;
    if (this.hp < 0) {
      this.hp = 0;
    }
    return dmg;
  };

  isAlive = (): boolean => {
    return this.hp > 0;
  };

  getShortStats = (isDead: boolean = false): string => {
    let tier = "";
    for (let i = 0; i < this.tier; i++) {
      tier += "⭐️";
    }
    let name = `${this.getName()}`;
    if (isDead) {
      name = `☠️<del>${name}</del>`;
    }
    const statsText = `<b>${name}</b> \- ${this.level} level ${tier}
    💚${this.hp.toFixed(1)}\\${this.hpMax.toFixed(1)} 🗡${this.damage.toFixed(
      1
    )} 🛡${this.armor.toFixed(0)}`;
    return statsText;
  };

  getHpIndicator = (): string => {
    const hpIndicator = `💚${this.hp.toFixed(1)}`;
    return hpIndicator;
  };
}
