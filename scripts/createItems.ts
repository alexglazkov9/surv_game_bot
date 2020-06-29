// import { ItemModel } from "../items/items.model";
import { connect, disconnect } from "../app/database/database";
// import { WeaponModel, ArmorModel } from "../app/database/items/items.model";
// import { logger } from "../app/utils/logger";
//import { db } from "../app";

(async () => {
  // logger.debug("jere");
  //connect();

  const weapons = [
    { name: "Club T1", damage: 2, ap_cost: 1, durability: 5, price: 5, attack_speed: 5000 },
    { name: "Knife T1", damage: 3, ap_cost: 2, durability: 6, price: 10, attack_speed: 5000 },
    { name: "Spear T1", damage: 4, ap_cost: 2, durability: 6, price: 12.5, attack_speed: 5500 },
    { name: "Sword T1", damage: 5, ap_cost: 2, durability: 6, price: 15, attack_speed: 5000 },
    { name: "Machete T1", damage: 6, ap_cost: 2, durability: 6, price: 17.5, attack_speed: 6000 },
    { name: "Bow T1", damage: 7, ap_cost: 2, durability: 6, price: 20, attack_speed: 7000 },
    { name: "Crossbow T1", damage: 8, ap_cost: 2, durability: 7, price: 22.5, attack_speed: 7500 },
    { name: "Handgun T1", damage: 9, ap_cost: 3, durability: 7, price: 25, attack_speed: 7500 },
    { name: "Shotgun T1", damage: 10, ap_cost: 3, durability: 8, price: 30, attack_speed: 10000 },
    { name: "SMG T1", damage: 12, ap_cost: 4, durability: 8, price: 35, attack_speed: 10000 },
    { name: "Rifle T1", damage: 15, ap_cost: 5, durability: 8, price: 50, attack_speed: 12500 },
    {
      name: "Assault rifle T1",
      damage: 18,
      ap_cost: 6,
      durability: 8,
      price: 70,
      attack_speed: 12500,
    },
    {
      name: "Sniper rifle T1",
      damage: 20,
      ap_cost: 7,
      durability: 8,
      price: 90,
      attack_speed: 15000,
    },
    {
      name: "Bazooka T1",
      damage: 40,
      ap_cost: 7,
      durability: 3,
      price: 150,
      attack_speed: 25000,
    },
    { name: "Club T2", damage: 2, ap_cost: 1, durability: 20, price: 25, attack_speed: 5000 },
    { name: "Knife T2", damage: 3, ap_cost: 2, durability: 25, price: 35, attack_speed: 5000 },
    { name: "Spear T2", damage: 4, ap_cost: 2, durability: 25, price: 50, attack_speed: 5000 },
    { name: "Sword T2", damage: 5, ap_cost: 2, durability: 25, price: 75, attack_speed: 5500 },
    { name: "Machete T2", damage: 6, ap_cost: 2, durability: 20, price: 90, attack_speed: 6000 },
    { name: "Bow T2", damage: 7, ap_cost: 2, durability: 20, price: 100, attack_speed: 7000 },
    { name: "Crossbow T2", damage: 8, ap_cost: 2, durability: 25, price: 115, attack_speed: 7500 },
    { name: "Handgun T2", damage: 9, ap_cost: 3, durability: 30, price: 125, attack_speed: 7500 },
    { name: "Shotgun T2", damage: 10, ap_cost: 3, durability: 40, price: 150, attack_speed: 10000 },
    { name: "SMG T2", damage: 12, ap_cost: 4, durability: 50, price: 175, attack_speed: 10000 },
    { name: "Rifle T2", damage: 15, ap_cost: 5, durability: 50, price: 250, attack_speed: 12500 },
    {
      name: "Assault rifle T2",
      damage: 18,
      ap_cost: 6,
      durability: 60,
      price: 350,
      attack_speed: 12500,
    },
    {
      name: "Sniper rifle T2",
      damage: 20,
      ap_cost: 7,
      durability: 60,
      price: 450,
      attack_speed: 15000,
    },
    {
      name: "Bazooka T2",
      damage: 40,
      ap_cost: 7,
      durability: 7,
      price: 500,
      attack_speed: 25000,
    },
    { name: "Club T3", damage: 4, ap_cost: 1, durability: 20, price: 50, attack_speed: 5000 },
    { name: "Knife T3", damage: 6, ap_cost: 2, durability: 25, price: 100, attack_speed: 5000 },
    { name: "Spear T3", damage: 8, ap_cost: 2, durability: 25, price: 115, attack_speed: 5000 },
    { name: "Sword T3", damage: 10, ap_cost: 2, durability: 25, price: 125, attack_speed: 5500 },
    { name: "Machete T3", damage: 12, ap_cost: 2, durability: 20, price: 175, attack_speed: 6000 },
    { name: "Bow T3", damage: 14, ap_cost: 2, durability: 20, price: 200, attack_speed: 7000 },
    { name: "Crossbow T3", damage: 16, ap_cost: 2, durability: 25, price: 215, attack_speed: 7500 },
    { name: "Handgun T3", damage: 18, ap_cost: 3, durability: 30, price: 250, attack_speed: 7500 },
    { name: "Shotgun T3", damage: 20, ap_cost: 3, durability: 40, price: 350, attack_speed: 10000 },
    { name: "SMG T3", damage: 24, ap_cost: 4, durability: 50, price: 480, attack_speed: 10000 },
    { name: "Rifle T3", damage: 30, ap_cost: 5, durability: 50, price: 550, attack_speed: 12500 },
    {
      name: "Assault rifle T3",
      damage: 36,
      ap_cost: 6,
      durability: 60,
      price: 650,
      attack_speed: 12500,
    },
    {
      name: "Sniper rifle T3",
      damage: 40,
      ap_cost: 7,
      durability: 60,
      price: 800,
      attack_speed: 15000,
    },
    {
      name: "Bazooka T3",
      damage: 80,
      ap_cost: 7,
      durability: 7,
      price: 1000,
      attack_speed: 25000,
    },
  ];

  const armors = [
    { name: "Cloth armor T1", armor: 1, durability: 5, price: 5 },
    { name: "Leather armor T1", armor: 2, durability: 6, price: 10 },
    { name: "Wooden armor T1", armor: 4, durability: 6, price: 15 },
    { name: "Iron armor T1", armor: 6, durability: 5, price: 25 },
    { name: "Golden armor T1", armor: 8, durability: 5, price: 30 },
    { name: "Heavy armor T1", armor: 10, durability: 6, price: 35 },
    { name: "Cloth armor T2", armor: 1, durability: 20, price: 30 },
    { name: "Leather armor T2", armor: 2, durability: 25, price: 50 },
    { name: "Wooden armor T2", armor: 4, durability: 30, price: 75 },
    { name: "Iron armor T2", armor: 6, durability: 35, price: 125 },
    { name: "Golden armor T2", armor: 8, durability: 40, price: 150 },
    { name: "Heavy armor T2", armor: 8, durability: 50, price: 250 },
    { name: "Cloth armor T3", armor: 2, durability: 20, price: 60 },
    { name: "Leather armor T3", armor: 4, durability: 25, price: 100 },
    { name: "Wooden armor T3", armor: 8, durability: 30, price: 150 },
    { name: "Iron armor T3", armor: 12, durability: 35, price: 250 },
    { name: "Golden armor T3", armor: 16, durability: 40, price: 300 },
    { name: "Heavy armor T3", armor: 20, durability: 50, price: 500 },
  ];

  try {
    for (const weapon of weapons) {
      try {
        // await WeaponModel.findOneAndUpdate({ name: weapon.name }, weapon, {
        //   upsert: true,
        //   new: true,
        //   setDefaultsOnInsert: true,
        // });
        console.log(`Created weapon ${weapon.name}`);
      } catch (e) {
        console.log(e);
      }
    }
    for (const armor of armors) {
      try {
        // await ArmorModel.findOneAndUpdate({ name: armor.name }, armor, {
        //   upsert: true,
        //   new: true,
        //   setDefaultsOnInsert: true,
        // });
        console.log(`Created armor ${armor.name}`);
      } catch (e) {
        console.log(e);
      }
    }

    // disconnect();
  } catch (e) {
    console.error(e);
  }

  //disconnect();
})();
