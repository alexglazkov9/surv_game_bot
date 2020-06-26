import { IBattleGround } from "./IBattleGround";
import { Unit } from "../Unit";
import TelegramBot from "node-telegram-bot-api";
import { IPlayerDocument } from "../../../database/players/players.types";
import { BattleEvents } from "./BattleEvents";

export class NPCBattle implements IBattleGround {
    chatId: number;
    bot: TelegramBot;
    teamA: Unit[];
    teamB:Unit[];

    constructor({chatId, bot}:{chatId:number, bot:TelegramBot}){
        this.chatId = chatId;
        this.bot = bot;

        this.teamA = [];
        this.teamB = [];
    }

    addToPlayersTeam = (unit: Unit) => {
        this.teamA.push(unit);
    }

    addToNPCTeam = (unit: Unit) => {
        this.teamB.push(unit);
    }

    startBattle = () => {
        if(this.teamB.length >= 0){
            this.startFight();
        }else{
            this.startPreFight();
        }
    }

    startFight = () => {

    }

    startPreFight = () => {
        this.teamB.forEach(unit => {
            unit.startAttacking();
            unit.addListener(BattleEvents.UNIT_ATTACKS, () => this.handlePreFightAttack(unit));
        });
    }

    handlePreFightAttack=(unit: Unit)=>{

    }

    attack = (attacker: Unit, target: Unit) => {
        attacker.attack(target);
    }
}