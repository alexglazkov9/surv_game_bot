import { IUnit } from "../units/IUnit";
import { Telegraph } from "../../telegraph/Telegraph";
import { SIDE } from "./battleground/BattleGround";
import { IndicatorsEmojis } from "../../misc/IndicatorsEmojis";
import { GameParams } from "../../misc/GameParameters";
import { AttackDetails, AttackModifier } from "../../misc/AttackDetails";

export class BattleLog {
  header: string[];
  battleHistory: string[];
  rewards: string[];
  footer: string[];

  constructor() {
    this.header = [];
    this.battleHistory = [];
    this.rewards = [];
    this.footer = [];

    this.header.push(`📜<b>Combat Log</b>\n`);
    this.rewards.push(`\n\n🎁<b>Rewards</b>`);
  }

  unitJoined = (unit: IUnit) => {
    this.battleHistory.push(`➕ ${unit.getName()} joined the fight`);
  };

  attacked = (attacker: IUnit, attack: AttackDetails, tag?: string) => {
    this.battleHistory.push(
      `${tag ?? ""}${attacker.getName()} ⚔️${this.getAttackModifier(
        attack.modifier
      )} ${attack.target?.getName()} ${attack.target?.getHpIndicator()}\nDealt <b>${attack.damageDealt.toFixed(
        1
      )}</b> damage`
    );
  };

  killed = (target: IUnit) => {
    this.battleHistory.push(`⚰️${target.getName()}`);
  };

  itemDropped = (unit: IUnit, item: string) => {
    this.rewards.push(`🔮${unit.getName()} picks up ${item}`);
  };

  expMoneyDropped = (units: IUnit[], exp: number, money: number) => {
    let names = "";
    units.forEach((unit, index) => {
      names += `${unit.getName()}${index + 1 !== units.length ? "," : ""}`;
    });
    this.rewards.push(
      `📯${names} get${units.length === 1 ? "s" : ""}: ${exp.toFixed(1)} exp, ${money.toFixed(
        2
      )} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b>`
    );
  };

  wagerWon = (unit: IUnit, money: number) => {
    this.rewards.push(
      `📯${unit.getName()} wins the wager: ${money} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b>`
    );
  };

  lastHitDrop = (unit: IUnit, target: IUnit, exp: number, money: number) => {
    this.rewards.push(
      `📯${unit.getName()} gets: ${exp.toFixed(1)} exp, ${money.toFixed(2)} <b>${
        IndicatorsEmojis.CURRENCY_MONEY
      }</b>`
    );
  };

  rewardsFrom = (unit: IUnit) => {
    this.rewards.push(`\n💀<b>${unit.getName()}</b>💀`);
  };

  battleEnd = (side: SIDE) => {
    let text = "";
    if (side === SIDE.HOST) {
      text += "Side 🟠 won the battle";
    } else {
      text += "Side 🔵 won the battle";
    }
    this.battleHistory.push(`\n<b>${text}</b>\n`);
  };

  addRecord = (record: string) => {
    this.battleHistory.push(record);
  };

  leftBattle = (unit: IUnit) => {
    this.battleHistory.push(`🚪${unit.getName()} found nobody and left the battle`);
  };

  leftDuel = (unit: IUnit) => {
    this.battleHistory.push(`🚪 Nobody accepted invitaion from ${unit.getName()}`);
  };

  foundUnit = (target: IUnit) => {
    this.battleHistory.push(`😱${target.getName()} has been found and attacked`);
  };

  hasRecords = (): boolean => {
    return this.battleHistory.length > 1;
  };

  getBattleLog = (opts?: { full: boolean }): string => {
    let battleLog = "";

    this.header.forEach((entry) => {
      battleLog += `${entry}\n`;
    });

    let battleHistory;
    if (opts?.full) {
      battleHistory = this.battleHistory;
    } else {
      battleHistory = this.battleHistory.slice(-GameParams.BATLLE_LOG_CHAT_LENGTH);
      if (this.battleHistory.length > GameParams.BATLLE_LOG_CHAT_LENGTH) {
        battleHistory = ["⦁ ⦁ ⦁", ...battleHistory];
      }
    }

    battleHistory.forEach((entry) => {
      battleLog += `${entry}\n`;
    });

    let rewardLog = "";
    this.rewards.forEach((entry) => {
      rewardLog += `${entry}\n`;
    });

    let footer = "";
    this.footer.forEach((entry) => {
      footer += `\n${entry}`;
    });

    return battleLog + (this.rewards.length > 1 ? rewardLog : "") + footer;
  };

  // Posts battle log to Telegra.ph and returns url
  postBattleLog = async (header: string): Promise<string> => {
    const url = await Telegraph.post(`${header}\n\n${this.getBattleLog({ full: true })}`);
    this.footer.push(`<a href="${url}">Full log</a>`);
    return url;
  };

  getAttackModifier(modifier: AttackModifier) {
    switch (modifier) {
      case AttackModifier.CRITICAL_STRIKE:
        return IndicatorsEmojis.CRIT_CHANCE;
      case AttackModifier.DODGE:
        return IndicatorsEmojis.DODGE_CHANCE;
      default:
        return "";
    }
  }
}
