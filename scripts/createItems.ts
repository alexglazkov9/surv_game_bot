import { connect, disconnect } from "../app/database/database";
import {
  WeaponModel,
  ArmorModel,
  ConsumableModel,
  ShopItemModel,
  ShopArmorModel,
  ShopWeaponModel,
  ShopConsumableModel,
} from "../app/database/items/items.model";
import { ConsumableEffects } from "../app/game/misc/ConsumableEffects";
import fs = require("fs");
import weapons = require("./weapons.json");
import armors = require("./armors.json");
import consumables = require("./consumables.json");
import shop_armors = require("./shop_armors.json");
import shop_weapons = require("./shop_weapons.json");
import shop_consumables = require("./shop_consumables.json");
import { GameParams } from "../app/game/misc/GameParameters";

(async () => {
  connect();

  try {
    for (const weapon of weapons) {
      try {
        await WeaponModel.findOneAndUpdate({ name: weapon.name }, weapon, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
        console.log(`Created weapon ${weapon.name}`);
      } catch (e) {
        console.log(e);
      }
    }
    for (const armor of armors) {
      try {
        await ArmorModel.findOneAndUpdate({ name: armor.name }, armor, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
        console.log(`Created armor ${armor.name}`);
      } catch (e) {
        console.log(e);
      }
    }
    for (const consumable of consumables) {
      try {
        const doc = await ConsumableModel.findOneAndUpdate({ name: consumable.name }, consumable, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
        doc.onConsumeEffects = consumable.onComsumeEffects;
        await doc.save();
        console.log(`Created consumable ${consumable.name}`);
      } catch (e) {
        console.log(e);
      }
    }

    for (const armor of shop_armors) {
      try {
        const armorScaled = { ...armor, quality: GameParams.ITEM_QUALITY_SHOP };
        armorScaled.armor *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.stamina *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.agility *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.strength *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.attack_speed *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.dodge_chance *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;
        armorScaled.crit_chance *= armorScaled.quality / GameParams.MAX_ITEM_QUALITY;

        const doc = await ShopArmorModel.findOneAndUpdate({ name: armorScaled.name }, armorScaled, {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        });
        console.log(`Created shop ${armor.name}`);
      } catch (e) {
        console.log(e);
      }
    }

    for (const weapon of shop_weapons) {
      try {
        const weaponScaled = { ...weapon, quality: GameParams.ITEM_QUALITY_SHOP };
        weaponScaled.damage *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.stamina *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.agility *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.strength *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.attack_speed *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.dodge_chance *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;
        weaponScaled.crit_chance *= weaponScaled.quality / GameParams.MAX_ITEM_QUALITY;

        const doc = await ShopWeaponModel.findOneAndUpdate(
          { name: weaponScaled.name },
          weaponScaled,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
        console.log(`Created shop ${weapon.name}`);
      } catch (e) {
        console.log(e);
      }
    }

    for (const consumable of shop_consumables) {
      try {
        const doc = await ShopConsumableModel.findOneAndUpdate(
          { name: consumable.name },
          consumable,
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
        doc.onConsumeEffects = consumable.onComsumeEffects;
        await doc.save();
        console.log(`Created shop ${consumable.name}`);
      } catch (e) {
        console.log(e);
      }
    }

    disconnect();
  } catch (e) {
    console.error(e);
  }
})();
