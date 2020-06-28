import { IUnit } from "../units/IUnit";

export class BattleLog {
  battleHistory: string[];
  constructor() {
    this.battleHistory = [];
  }

  unitJoined = (unit: IUnit) => {
    this.battleHistory.push(`📍 ${unit.getName()} joined the fight`);
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

  addRecord = (record: string) => {
    this.battleHistory.push(record);
  };

  getBattleLog = (): string => {
    let battleLog = "";
    this.battleHistory.forEach((entry) => {
      battleLog += `${entry}\n`;
    });
    return battleLog;
  };
}
