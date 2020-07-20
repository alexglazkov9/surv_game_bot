import { IUnit } from "../models/units/IUnit";

export enum AttackModifier {
  NORMAL,
  CRITICAL_STRIKE,
  DODGE,
}
export class AttackDetails {
  damageDealt: number = 0;
  target?: IUnit;
  modifier: AttackModifier = AttackModifier.NORMAL;
}
