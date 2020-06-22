//import { ItemModel } from "../items/items.model";
//import { connect, disconnect } from "../database/database";
import { db } from "../app";

(async () => {
    //const db = connect();

    const weapons = [
        { name: "Club", damage: 2, ap_cost: 1, durability: 20, price: 25 },
        { name: "Knife", damage: 3, ap_cost: 2, durability: 25, price: 50 },
        { name: "Bow", damage: 5, ap_cost: 2, durability: 20, price: 75 },
        { name: "Handgun", damage: 8, ap_cost: 3, durability: 30, price: 125 },
        { name: "Shotgun", damage: 10, ap_cost: 3, durability: 40, price: 150 },
        { name: "SMG", damage: 12, ap_cost: 4, durability: 50, price: 175 },
        { name: "Rifle", damage: 15, ap_cost: 5, durability: 50, price: 250 },
        { name: "Assault rifle", damage: 18, ap_cost: 6, durability: 60, price: 350 },
        { name: "Sniper rifle", damage: 20, ap_cost: 7, durability: 60, price: 450 }
    ];

    const armors = [
        { name: "Cloth armor", armor: 1, durability: 10, price: 25 },
        { name: "Leather armor", armor: 2, durability: 20, price: 50 },
        { name: "Wooden armor", armor: 4, durability: 25, price: 75 },
        { name: "Iron armor", armor: 6, durability: 30, price: 125 },
        { name: "Heavy armor", armor: 8, durability: 40, price: 250 },
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