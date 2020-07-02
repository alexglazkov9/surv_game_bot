import { connect, disconnect } from "../app/database/database";
import { WeaponModel, ArmorModel, ConsumableModel } from "../app/database/items/items.model";
import { ConsumableEffects } from "../app/game/misc/ConsumableEffects";
import fs = require("fs");
import weapons = require("./weaponsTEST.json");
import armors = require("./armors.json");
import consumables = require("./consumables.json");

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

    disconnect();
  } catch (e) {
    console.error(e);
  }
})();
