import { IUnit } from "../units/IUnit";

export class BattleLog {
  battleHistory: string[];
  constructor() {
    this.battleHistory = [];
    this.battleHistory.push(`📜<b>Combat Log</b>\n`);
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
    this.battleHistory.push(`🔮${unit.getName()} picks up ${item}`);
  };

  expMoneyDropped = (exp: number, money: number) => {
    this.battleHistory.push(`🎁Players get: ${exp.toFixed(1)} exp, ${money.toFixed(2)} money`);
  };

  battleEnd = () => {
    this.battleHistory.push(`\n<b>🛑Battle ended</b>\n`);
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
    return battleLog;
  };
}
