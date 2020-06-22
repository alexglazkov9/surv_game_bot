//import { ItemModel } from "../items/items.model";
//import { connect, disconnect } from "../database/database";
import { db } from "../app";

(async () => {
    //const db = connect();

    const weapons = [
        { name: "Club T1", damage: 2, ap_cost: 1, durability: 3, price: 5, attack_speed: 5000 },
        { name: "Knife T1", damage: 3, ap_cost: 2, durability: 3, price: 10, attack_speed: 5000 },
        { name: "Bow T1", damage: 5, ap_cost: 2, durability: 3, price: 15, attack_speed: 7500 },
        { name: "Handgun T1", damage: 8, ap_cost: 3, durability: 3, price: 25, attack_speed: 7500 },
        { name: "Shotgun T1", damage: 10, ap_cost: 3, durability: 4, price: 30, attack_speed: 10000 },
        { name: "SMG T1", damage: 12, ap_cost: 4, durability: 4, price: 35, attack_speed: 10000 },
        { name: "Rifle T1", damage: 15, ap_cost: 5, durability: 4, price: 50, attack_speed: 12500 },
        { name: "Assault rifle T1", damage: 18, ap_cost: 6, durability: 4, price: 70, attack_speed: 12500 },
        { name: "Sniper rifle T1", damage: 20, ap_cost: 7, durability: 4, price: 90, attack_speed: 15000 },
        { name: "Club T2", damage: 2, ap_cost: 1, durability: 20, price: 25, attack_speed: 5000 },
        { name: "Knife T2", damage: 3, ap_cost: 2, durability: 25, price: 50, attack_speed: 5000 },
        { name: "Bow T2", damage: 5, ap_cost: 2, durability: 20, price: 75, attack_speed: 7500 },
        { name: "Handgun T2", damage: 8, ap_cost: 3, durability: 30, price: 125, attack_speed: 7500 },
        { name: "Shotgun T2", damage: 10, ap_cost: 3, durability: 40, price: 150, attack_speed: 10000 },
        { name: "SMG T2", damage: 12, ap_cost: 4, durability: 50, price: 175, attack_speed: 10000 },
        { name: "Rifle T2", damage: 15, ap_cost: 5, durability: 50, price: 250, attack_speed: 12500 },
        { name: "Assault rifle T2", damage: 18, ap_cost: 6, durability: 60, price: 350, attack_speed: 12500 },
        { name: "Sniper rifle T2", damage: 20, ap_cost: 7, durability: 60, price: 450, attack_speed: 15000 }
    ];

    const armors = [
        { name: "Cloth armor T1", armor: 1, durability: 3, price: 5 },
        { name: "Leather armor T1", armor: 2, durability: 3, price: 10 },
        { name: "Wooden armor T1", armor: 4, durability: 3, price: 15 },
        { name: "Iron armor T1", armor: 6, durability: 4, price: 25 },
        { name: "Heavy armor T1", armor: 8, durability: 4, price: 35 },
        { name: "Cloth armor T2", armor: 1, durability: 10, price: 25 },
        { name: "Leather armor T2", armor: 2, durability: 20, price: 50 },
        { name: "Wooden armor T2", armor: 4, durability: 25, price: 75 },
        { name: "Iron armor T2", armor: 6, durability: 30, price: 125 },
        { name: "Heavy armor T2", armor: 8, durability: 40, price: 250 },
    ];

    try {
        for (const weapon of weapons) {
            try {
                await db?.WeaponModel.findOneAndUpdate({ name: weapon.name }, weapon, { upsert: true, new: true, setDefaultsOnInsert: true });
                console.log(`Created weapon ${weapon.name}`);
            } catch (e) {
                console.log(e);
            }
        }
        for (const armor of armors) {
            try {
                await db?.ArmorModel.findOneAndUpdate({ name: armor.name }, armor, { upsert: true, new: true, setDefaultsOnInsert: true });
                console.log(`Created armor ${armor.name}`);
            } catch (e) {
                console.log(e);
            }
        }

        //disconnect();
    } catch (e) {
        console.error(e);
    }
})();