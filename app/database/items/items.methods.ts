import { IItemDocument, IWeaponDocument, IArmorDocument, IConsumableDocument } from "./items.types";
import { ItemType } from "../../game/misc/ItemType";

export function getItemStats(this: IItemDocument, options?: { showPrice: boolean }): string {
  let statsString = "";
  switch (this.__t) {
    case ItemType.WEAPON: {
      const weapon = this as IWeaponDocument;
      statsString += `<b>${weapon.name}</b> ${
        options?.showPrice ? `- <i>$${weapon.price}</i>` : ""
      }\n
                🗡Dmg: <b>${weapon.damage}</b>
                ⚙️Dur: <b>${weapon.durability}</b>
                ⚡️Speed: <b>Every ${(weapon.attack_speed / 1000).toFixed(1)} sec</b>
                `;
      break;
    }
    case ItemType.ARMOR: {
      const armor = this as IArmorDocument;
      statsString += `<b>${armor.name}</b> ${options?.showPrice ? `- <i>$${armor.price}</i>` : ""}\n
                🛡Armor: <b>${armor.armor}</b>
                ⚙️Dur: <b>${armor.durability}</b>
                `;
      break;
    }
    case ItemType.CONSUMABLE: {
      const consumable = this as IConsumableDocument;
      let effects = "";
      consumable.onConsumeEffects.forEach((effect) => {
        effects += `
        🌀 Effect: <b>${effect.effect}</b>
        🩹 Amount: <b>${effect.value}</b>\n`;
      });
      statsString += `<b>${consumable.name}</b> ${
        options?.showPrice ? `- <i>$${consumable.price}</i>` : ""
      }\n
        ⚙️ Charges: <b>${consumable.charges}</b>${effects}`;
      break;
    }
    default: {
      break;
    }
  }

  return statsString;
}
