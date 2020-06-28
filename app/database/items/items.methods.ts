import { IItemDocument, IWeaponDocument, IArmorDocument } from "./items.types";
import { ItemType } from "./ItemType";

export function getItemStats(this: IItemDocument): string {
  let statsString = "";
  switch (this.__t) {
    case ItemType.WEAPON: {
      const weapon = this as IWeaponDocument;
      statsString += `*${weapon.name}* - _$${weapon.price}_\n
                🗡Dmg: *${weapon.damage}*
                ⚙️Dur: *${weapon.durability}*
                ⚡️Speed: *Every ${(weapon.attack_speed / 1000).toFixed(1)} sec*
                `;
      break;
    }
    case ItemType.ARMOR: {
      const armor = this as IArmorDocument;
      statsString += `*${armor.name}* - _$${armor.price}_\n
                🛡Armor: *${armor.armor}*
                ⚙️Dur: *${armor.durability}*
                `;
      break;
    }
    default: {
      break;
    }
  }

  return statsString;
}
