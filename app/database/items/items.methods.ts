import { IItemDocument, IWeaponDocument, IArmorDocument, IConsumableDocument } from "./items.types";
import { ItemType } from "../../game/misc/ItemType";
import { IndicatorsEmojis } from "../../game/misc/IndicatorsEmojis";
import { GameParams } from "../../game/misc/GameParameters";

const SPACES = "        ";

export function getItemStats(
  this: IItemDocument,
  options?: { showPrice: boolean; showSellPrice: boolean }
): string {
  let statsString = "";
  switch (this.__t) {
    case ItemType.WEAPON: {
      const weapon = this as IWeaponDocument;
      statsString += `<b>${weapon.name}</b> ${
        options?.showPrice
          ? `- <i>${weapon.price} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b> </i>`
          : ""
      }\n${SPACES}${IndicatorsEmojis.DAMAGE}Dmg: <b>${weapon.damage.toFixed(2)}</b>\n${SPACES}${
        IndicatorsEmojis.BASE_ATTACK_SPEED_ITEM
      }Base Speed: <b>Every ${(weapon.base_attack_speed / 1000).toFixed(1)} sec</b>\n\n${
        weapon.stamina !== 0
          ? `${SPACES}${IndicatorsEmojis.STAMINA}Stamina: ${weapon.stamina.toFixed(2)}\n`
          : ""
      }${
        weapon.agility !== 0
          ? `${SPACES}${IndicatorsEmojis.AGILITY}Agility: ${weapon.agility.toFixed(2)}\n`
          : ""
      }${
        weapon.strength !== 0
          ? `${SPACES}${IndicatorsEmojis.STRENGTH}Strength: ${weapon.strength.toFixed(2)}\n`
          : ""
      }${
        weapon.attack_speed !== 0
          ? `${SPACES}${IndicatorsEmojis.ATTACK_SPEED}Attack Speed: ${weapon.attack_speed.toFixed(
              2
            )}\n`
          : ""
      }${
        weapon.crit_chance !== 0
          ? `${SPACES}${IndicatorsEmojis.CRIT_CHANCE}Crit Chance: ${weapon.crit_chance.toFixed(
              2
            )}\n`
          : ""
      }${
        weapon.dodge_chance !== 0
          ? `${SPACES}${IndicatorsEmojis.DODGE_CHANCE}Dodge Chance: ${weapon.dodge_chance.toFixed(
              2
            )}\n`
          : ""
      }
      \n${SPACES}Level required: ${weapon.min_lvl}
      \n${SPACES}${IndicatorsEmojis.ITEM_QUALITY}Quality: ${weapon.quality}`;

      statsString += `${
        options?.showSellPrice
          ? `\n${SPACES}Sell price: ${(
              weapon.price *
              GameParams.SELL_PRICE_FACTOR *
              (weapon.quality / GameParams.MAX_ITEM_QUALITY)
            ).toFixed(2)} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b>`
          : ""
      }\n`;
      break;
    }
    case ItemType.ARMOR: {
      const armor = this as IArmorDocument;
      // Name, type and price
      statsString += `<b>${armor.name}</b>  - ${armor.type} ${
        options?.showPrice
          ? `- <i>${armor.price} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b></i>`
          : ""
      }\n`;

      statsString += `${SPACES}${IndicatorsEmojis.ARMOR}Armor: <b>${armor.armor.toFixed(
        2
      )}</b>\n\n`;

      if (armor.stamina !== 0)
        statsString += `${SPACES}${IndicatorsEmojis.STAMINA}Stamina: ${armor.stamina.toFixed(2)}\n`;
      if (armor.agility !== 0)
        statsString += `${SPACES}${IndicatorsEmojis.AGILITY}Agility: ${armor.agility.toFixed(2)}\n`;
      if (armor.strength !== 0)
        statsString += `${SPACES}${IndicatorsEmojis.STRENGTH}Strength: ${armor.strength.toFixed(
          2
        )}\n`;
      if (armor.attack_speed !== 0)
        statsString += `${SPACES}${
          IndicatorsEmojis.ATTACK_SPEED
        }Attack Speed: ${armor.attack_speed.toFixed(2)}\n`;
      if (armor.crit_chance !== 0)
        statsString += `${SPACES}${
          IndicatorsEmojis.CRIT_CHANCE
        }Crit Chance: ${armor.crit_chance.toFixed(2)}\n`;
      if (armor.dodge_chance !== 0)
        statsString += `${SPACES}${
          IndicatorsEmojis.DODGE_CHANCE
        }Dodge Chance: ${armor.dodge_chance.toFixed(2)}\n`;

      statsString += `\n${SPACES}Level required: ${armor.min_lvl}`;
      statsString += `\n${SPACES}${IndicatorsEmojis.ITEM_QUALITY}Quality: ${armor.quality}`;
      statsString += `${
        options?.showSellPrice
          ? `\n${SPACES}Sell price: ${(
              armor.price *
              GameParams.SELL_PRICE_FACTOR *
              (armor.quality / GameParams.MAX_ITEM_QUALITY)
            ).toFixed(2)} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b>`
          : ""
      }\n`;
      break;
    }
    case ItemType.CONSUMABLE: {
      const consumable = this as IConsumableDocument;
      let effects = "";
      consumable.onConsumeEffects.forEach((effect) => {
        effects += `
        ${IndicatorsEmojis.CONSUMABLE_EFFECT} Effect: <b>${effect.effect}</b>
        ${IndicatorsEmojis.CONSUMABLE_AMOUNT} Amount: <b>${effect.value}</b>\n`;
      });
      statsString += `<b>${consumable.name}</b> ${
        options?.showPrice
          ? `- <i>${consumable.price} <b>${IndicatorsEmojis.CURRENCY_MONEY}</b></i>`
          : ""
      }\n
      ${IndicatorsEmojis.CONSUMABLE_CHARGES} Charges: <b>${consumable.charges}</b>${effects}`;
      break;
    }
    default: {
      break;
    }
  }

  return statsString;
}
