import { IItemDocument, IWeaponDocument, IArmorDocument, IConsumableDocument } from "./items.types";
import { ItemType } from "../../game/misc/ItemType";

const SPACES = "        ";

export function getItemStats(this: IItemDocument, options?: { showPrice: boolean }): string {
  let statsString = "";
  switch (this.__t) {
    case ItemType.WEAPON: {
      const weapon = this as IWeaponDocument;
      statsString += `<b>${weapon.name}</b> ${
        options?.showPrice ? `- <i>$${weapon.price}</i>` : ""
      }\n${SPACES}🗡Dmg: <b>${weapon.damage}</b>\n${SPACES}⚡️Base Speed: <b>Every ${(
        weapon.base_attack_speed / 1000
      ).toFixed(1)} sec</b>\n\n${
        weapon.stamina !== 0 ? `${SPACES}🈳Stamina: ${weapon.stamina}\n` : ""
      }${weapon.agility !== 0 ? `${SPACES}🈯️Agility: ${weapon.agility}\n` : ""}${
        weapon.strength !== 0 ? `${SPACES}🈴Strength: ${weapon.strength}\n` : ""
      }${weapon.attack_speed !== 0 ? `${SPACES}🔄Attack Speed: ${weapon.attack_speed}\n` : ""}${
        weapon.crit_chance !== 0 ? `${SPACES}💢Crit Chance: ${weapon.crit_chance}\n` : ""
      }${
        weapon.dodge_chance !== 0 ? `${SPACES}✨Dodge Chance: ${weapon.dodge_chance}\n` : ""
      }\n${SPACES}Quality: ${weapon.quality}`;
      break;
    }
    case ItemType.ARMOR: {
      const armor = this as IArmorDocument;
      // Name, type and price
      statsString += `<b>${armor.name}</b>  - ${armor.type} ${
        options?.showPrice ? `- <i>$${armor.price}</i>` : ""
      }\n`;

      statsString += `${SPACES}🛡Armor: <b>${armor.armor}</b>\n\n`;

      if (armor.stamina !== 0) statsString += `${SPACES}🈳Stamina: ${armor.stamina}\n`;
      if (armor.agility !== 0) statsString += `${SPACES}🈯️Agility: ${armor.agility}\n`;
      if (armor.strength !== 0) statsString += `${SPACES}🈴Strength: ${armor.strength}\n`;
      if (armor.attack_speed !== 0)
        statsString += `${SPACES}🔄Attack Speed: ${armor.attack_speed}\n`;
      if (armor.crit_chance !== 0) statsString += `${SPACES}💢Crit Chance: ${armor.crit_chance}\n`;
      if (armor.dodge_chance !== 0)
        statsString += `${SPACES}✨Dodge Chance: ${armor.dodge_chance}\n`;

      statsString += `\n${SPACES}Quality: ${armor.quality}`;
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
