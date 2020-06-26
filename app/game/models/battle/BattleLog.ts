import { IUnit } from "../units/IUnit";

export class BattleLog {
  battleHistory: string[];
  constructor() {
    this.battleHistory = [];
  }

  unitJoined = (unit: IUnit) => {
    this.battleHistory.push(`📍 ${unit.getName()} joined the fight`);
  };

  attacked = (attacker: IUnit, target: IUnit, dmgDealt: number) => {
    this.battleHistory.push(`${attacker.getName()} ⚔️ ${target.getName()} - ${dmgDealt}`);
  };

  killed = (attacker: IUnit, target: IUnit) => {
    this.battleHistory.push(`${attacker.getName()} ⚰️ ${target.getName()}`);
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
