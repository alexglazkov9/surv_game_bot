import { IUnit } from "../units/IUnit";
import { SIDE } from "./NPCBattle";

export class BattleLog {
  battleHistory: string[];
  rewards: string[];
  constructor() {
    this.battleHistory = [];
    this.rewards = [];

    this.battleHistory.push(`📜<b>Combat Log</b>\n`);
    this.rewards.push(`\n\n🎁<b>Rewards</b>`);
  }

  unitJoined = (unit: IUnit) => {
    this.battleHistory.push(`➕ ${unit.getName()} joined the fight`);
  };

  attacked = (attacker: IUnit, target: IUnit, dmgDealt: number, tag?: string) => {
    this.battleHistory.push(
      `${
        tag ?? ""
      }${attacker.getName()} ⚔️ ${target.getName()} ${target.getHpIndicator()}\nDealt <b>${dmgDealt.toFixed(
        1
      )}</b> damage`
    );
  };

  killed = (attacker: IUnit, target: IUnit) => {
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
      )} money`
    );
  };

  lastHitDrop = (unit: IUnit, target: IUnit, exp: number, money: number) => {
    this.rewards.push(`📯${unit.getName()} gets: ${exp.toFixed(1)} exp, ${money.toFixed(2)} money`);
  };

  rewardsFrom = (unit: IUnit) => {
    this.rewards.push(`\n💀<b>${unit.getName()}</b>💀`);
  };

  battleEnd = (side: SIDE) => {
    let text = "";
    if (side === SIDE.B) {
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

  foundUnit = (target: IUnit) => {
    this.battleHistory.push(`😱${target.getName()} has been found and attacked`);
  };

  hasRecords = (): boolean => {
    return this.battleHistory.length > 1;
  };

  getBattleLog = (): string => {
    let battleLog = "";
    this.battleHistory.forEach((entry) => {
      battleLog += `${entry}\n`;
    });
    let rewardLog = "";
    this.rewards.forEach((entry) => {
      rewardLog += `${entry}\n`;
    });
    return battleLog + (this.rewards.length > 1 ? rewardLog : "");
  };
}
