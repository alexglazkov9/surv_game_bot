import { IConsumableDocument, IConsumable } from "./items.types";
import { ConsumableEffects } from "./ConsumableEffects";
import { IPlayerDocument } from "../players/players.types";

export function onConsume(this: IConsumableDocument, target: IPlayerDocument): void {
  this.onConsumeEffects.forEach((effect) => {
    switch (effect.effect) {
      case ConsumableEffects.RESTORE_HP: {
        target.gainHP(effect.value);
        this.charges--;
        break;
      }
      case ConsumableEffects.RESTORE_HP_PERCENT: {
        target.gainHP(effect.value, { isPercentage: true });
        this.charges--;
        break;
      }
    }
    target.inventory.forEach((item, index) => {
      if (item._id.toString() === this._id.toString()) {
        (item as IConsumable).charges--;
        if ((item as IConsumable).charges <= 0) {
          target.inventory.splice(index, 1);
          target.recalculateAndSave();
        }
      }
    });
  });
}
