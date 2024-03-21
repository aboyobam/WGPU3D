import Vector3 from "@/core/Math/Vector3";
import Light from "./Light";
import dirty from "@/util/dirty";
import Color from "@/core/Math/Color";
import ShadowLight from "./ShadowLight";
import { mat4, vec3 } from "wgpu-matrix";

export default class SunLight extends ShadowLight {
    static readonly castShadow = true;
    
    @dirty declare intensity: number;

    constructor(
        intensity: number,
        public color: Color,
        public target: Vector3
    ) {
        super();
        this.intensity = intensity;
    }

    get asBuffer() {
        const data = new Float32Array(Light.MEMORY_SIZE);
        const [dx, dy, dz] = vec3.normalize(vec3.sub(this.position.asBuffer, this.target.asBuffer));
        data.set([
            dx, dy, dz,
            0,
            this.color.r,
            this.color.g,
            this.color.b,
            0,
            Light.Types.Sun,
            this.intensity,
            this.castShadow ? 1 : 0,
        ]);

        data.set(this.lightMatrix, 24);

        return data;
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

    get lightMatrix(): Float32Array {

        const lightViewMatrix = mat4.lookAt(this.position.asBuffer, this.target.asBuffer, [0, 1, 0]);
        const lightProjectionMatrix = mat4.ortho(-20, 20, -20, 20, 1, 200);
        return mat4.multiply(lightProjectionMatrix, lightViewMatrix) as Float32Array;
    }
}