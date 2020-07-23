import { Effect } from "./IEffect";
import { IUnit } from "../units/IUnit";
import { AttackDetails } from "../../misc/AttackDetails";

export class InstantDamage extends Effect {
  _damage: number;
  constructor(unit: IUnit, damage: number) {
    super(unit);

    this._damage = damage;
  }

  _update(delta: number): void {
    console.log("Applying instant damage");
    const attackDetails = new AttackDetails();
    attackDetails.damageDealt = this._damage;
    this._unit?.takeDamage(attackDetails);
    this._dispose();
  }
}
