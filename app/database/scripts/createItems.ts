import { ItemModel } from "../items/items.model";
import { connect, disconnect } from "../database";

(async () => {
    connect();

    const players = [
        { name: "Valera" },
        { name: "Fist" },
        { name: "Ras7le" },
        { name: "lexarit" }
    ];

    try {
        for (const player of players) {
            await PlayerModel.create(player);
            console.log(`Created player ${player.name}`);
        }

        disconnect();
    } catch (e) {
        console.error(e);
    }
})();