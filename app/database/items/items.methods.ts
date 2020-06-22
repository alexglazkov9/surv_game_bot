import { IItemDocument, IWeapon, IWeaponDocument, IArmorDocument } from "./items.types";
import { ItemType } from "./items.model";

export function getItemStats(this: IItemDocument): string {
    var stats_string = '';
    switch (this.__t) {
        case ItemType.WEAPON: {
            let weapon = this as IWeaponDocument;
            stats_string += `*${weapon.name}* - _${weapon.price}_\n
                🗡Dmg: *${weapon.damage}*
                ⚙️Dur: *${weapon.durability}*
                ⚡️AP: *${weapon.ap_cost}*
                `;
            break;
        }
        case ItemType.ARMOR: {
            let armor = this as IArmorDocument;
            stats_string += `*${armor.name}* - _${armor.price}_\n
                🛡Dmg: *${armor.armor}*
                ⚙️Dur: *${armor.durability}*
                `;
            break;
        }
        default: {
            break;
        }
    }

    return stats_string;
}