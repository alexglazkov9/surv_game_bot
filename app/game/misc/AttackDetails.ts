export enum AttackModifier {
  NORMAL,
  CRITICAL_STRIKE,
  DODGE,
}
export class AttackDetails {
  damageDealt: number;
  modifier: AttackModifier;

  constructor({ damageDealt, modifier }: { damageDealt: number; modifier: AttackModifier }) {
    this.damageDealt = damageDealt;
    this.modifier = modifier;
  }
}
