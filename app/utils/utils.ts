/* Return random number between min(inclusive) and max(exclusive) */
export function getRandomInt(min: number, max: number): number {
    //return min + Math.floor(Math.random() * Math.floor(max - min));
    return Math.floor(Math.random() * (max - min)) + min;
}