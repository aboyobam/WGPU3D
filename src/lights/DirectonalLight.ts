import dirty from "@/util/dirty";
import Light from "./Light";
import Color from "@/core/Math/Color";
import Vector3 from "@/core/Math/Vector3";
import { mat4, vec3 } from "wgpu-matrix";
import ShadowLight from "./ShadowLight";

export default class DirectionalLight extends ShadowLight {
    static readonly castShadow = true;

    @dirty declare decay: number;
    @dirty declare spotIntensity: number;
    @dirty declare intensity: number;
    @dirty declare innerCone: number;
    @dirty declare outerCone: number;

    readonly target = new Vector3();

    constructor(
        intensity: number,
        decay: number,
        public color: Color
    ) {
        super();
        this.intensity = intensity;
        this.decay = decay;
        this.spotIntensity = 1;
    }

    get asBuffer() {
        const [x, y, z] = mat4.getTranslation(this.transform.asBuffer);

        return new Float32Array([
            x, y, z,
            0,
            this.color.r,
            this.color.g,
            this.color.b,
            Light.Types.Directional,
            this.intensity,
            this.decay,
            this.innerCone,
            this.outerCone,
            this.target.x,
            this.target.y,
            this.target.z,
            this.spotIntensity
        ]);
    }

    get isDirty() {
        return this.dirty || this.color.dirty || this.position.dirty || this.target.dirty;
    }

    clean() {
        this.dirty = false;
        this.color.dirty = false;
        this.position.dirty = false;
        this.target.dirty = false;
    }
}