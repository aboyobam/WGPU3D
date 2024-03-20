import Vector3 from "@/core/Math/Vector3";
import Light from "./Light";
import dirty from "@/util/dirty";
import Color from "@/core/Math/Color";

export default class SunLight extends Light {
    @dirty declare intensity: number;

    constructor(
        intensity: number,
        public color: Color,
        public direction: Vector3
    ) {
        super();
        this.intensity = intensity;
    }

    get asBuffer() {
        return new Float32Array([
            this.direction.x,
            this.direction.y,
            this.direction.z,
            0,
            this.color.r,
            this.color.g,
            this.color.b,
            Light.Types.Sun,
            this.intensity
        ]);
    }

    get isDirty() {
        return this.dirty || this.color.dirty || this.position.dirty || this.direction.dirty;
    }

    clean() {
        this.dirty = false;
        this.color.dirty = false;
        this.position.dirty = false;
        this.direction.dirty = false;
    }
}