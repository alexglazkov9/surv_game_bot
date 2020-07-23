import { IUpdatable } from "../../IUpdatable";
import { IUnit } from "../units/IUnit";
import { engine } from "../../../app";
import { AttackDetails } from "../../misc/AttackDetails";

export interface IEffect extends IUpdatable {
  _unit: IUnit | null;
}

export abstract class Effect implements IEffect {
  _unit: IUnit | null;

  constructor(unit: IUnit) {
    this._unit = unit;
  }

  _update(delta: number) {}

  _dispose() {
    this._unit?.removeEffect(this);
    this._unit = null;
    engine.Remove(this);
  }
}
