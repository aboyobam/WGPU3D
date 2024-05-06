import Color from "@/core/Math/Color";
import Light from "./Light";
import dirty from "@/util/dirty";
import { mat4 } from "wgpu-matrix";

export default class PointLight extends Light {
    static readonly castShadow = false;

    @dirty declare intensity: number;
    @dirty declare decay: number;

    constructor(
        intensity: number,
        decay: number,
        public color: Color
    ) {
        super();
        this.intensity = intensity;
        this.decay = decay;
    }

    get asBuffer() {
        const [x, y, z] = mat4.getTranslation(this.transform.asBuffer);
        return new Float32Array([
            x, y, z,
            0,
            this.color.r,
            this.color.g,
            this.color.b,
            0,
            Light.Types.Point,
            this.intensity,
            this.decay
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