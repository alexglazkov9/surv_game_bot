import { Document } from "mongoose";
import { IPlayerDocument, IPlayerModel } from "./players.types";
import { bot } from "../../app";
import { Enemy } from "../../game/model/Enemy";

export function getPlayerStats(this: IPlayerDocument): string {
    let stats_string =
        `*${this.name}* - ${this.level} lvl ${this.health_points <= 0 ? "💀DEAD💀" : ""}\n
     💚HP: ${this.health_points}\\${this.health_points_max}
     🛡Armor: ${this.armor}\\${this.armor_max}
     ❇Exp: ${this.experience}\\${this.getExpCap()}
     ⚡️ActionPoint: ${this.action_points}
     💰Cash: ${this.money}
    `;
    return stats_string;
}

export function recalculateAndSave(this: IPlayerDocument): void {
    if (this.health_points <= 0) {
        this.die();
    }

    if (this.experience >= this.getExpCap()) {
        this.levelUp();
    }
}

export function die(this: IPlayerDocument): void {
    this.health_points = 0;
    this.action_points /= 2;
    this.experience = 0;
    this.save();
    bot.sendMessage(this.chat_id, `${this.name} died like a lil bitch`);
}

export function levelUp(this: IPlayerDocument): void {
    this.experience -= this.getExpCap();
    this.level++;
    this.save();
}

export function takeDamage(this: IPlayerDocument, dmg: number): void {
    this.health_points -= dmg;
    this.save();
    this.recalculateAndSave();
}

export function getExpCap(this: IPlayerDocument): number {
    return this.level + 10 - 1;
}

export function getHitDamage(this: IPlayerDocument): number {
    return this.level;
}

export function hitEnemy(this: IPlayerDocument, enemy: Enemy): void {
    enemy.takeDamage(this.getHitDamage());
    this.action_points -= 1;//cost of the action
    this.save();
}

export function canAttack(this: IPlayerDocument): boolean {
    return this.health_points > 0 && this.action_points > 0;
}

export function revive(this: IPlayerDocument): void {
    this.health_points = this.health_points_max / 2;
    this.save();
}

export function passiveRegen(this: IPlayerDocument, percentage: number): void {
    this.health_points += this.health_points_max * (percentage / 100);
    if (this.health_points > this.health_points_max) {
        this.health_points = this.health_points_max;
    }
    this.save();
}

export function gainAP(this: IPlayerDocument, base_amount: number = 1): void {
    this.action_points += base_amount;
    this.save();
}