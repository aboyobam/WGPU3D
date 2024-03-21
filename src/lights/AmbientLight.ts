import Color from "@/core/Math/Color";
import Light from "./Light";
import dirty from "@/util/dirty";

export default class AmbientLight extends Light {
    static readonly castShadow = false;
    @dirty declare intensity: number;

    constructor(public readonly color: Color, intensity: number) {
        super();
        this.intensity = intensity;
    }

    get asBuffer() {
        return new Float32Array([
            0, 0, 0, 0,
            this.color.r * this.intensity,
            this.color.g * this.intensity,
            this.color.b * this.intensity,
            Light.Types.Ambient
        ]);
    }

    get isDirty() {
        return this.dirty || this.color.dirty || this.position.dirty;
    }

    clean() {
        this.dirty = false;
        this.color.dirty = false;
        this.position.dirty = false;
    }
}