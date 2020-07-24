import { IUnit } from "../units/IUnit";
import { AttackDetails } from "../../misc/AttackDetails";
import { IUpdatable } from "../../IUpdatable";
import { engine } from "../../../app";

export abstract class Ability {
  //_targets: IUnit[];
  cast(targets: IUnit){}
}
