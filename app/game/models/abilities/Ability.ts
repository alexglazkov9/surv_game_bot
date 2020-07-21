import { IUnit } from "../units/IUnit";
import { AttackDetails } from "../../misc/AttackDetails";
import { IUpdatable } from "../../IUpdatable";

export class Ability {
  //_targets: IUnit[];
}

// tslint:disable-next-line: max-classes-per-file
export interface IAbilityEffect extends IUpdatable {
  _unit: IUnit | null;
}

// tslint:disable-next-line: max-classes-per-file
export class InstantDamage implements IAbilityEffect {
  _unit: IUnit | null;
  _damage: number;
  constructor(unit: IUnit, damage: number) {
    this._unit = unit;
    this._damage = damage;
  }

  update(delta: number): void {
    console.log("Applying instant damage");
    let attackDetails = new AttackDetails();
    attackDetails.damageDealt = this._damage;
    this._unit?.takeDamage(attackDetails);
    this._unit?.removeEffect(this);
    this._unit = null;
  }
}
