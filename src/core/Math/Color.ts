import dirty from "@/util/dirty";

export default class Color {
    @dirty declare r: number;
    @dirty declare g: number;
    @dirty declare b: number;
    declare dirty: boolean;

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}