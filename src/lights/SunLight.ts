import Vector3 from "@/core/Math/Vector3";
import Light from "./Light";
import dirty from "@/util/dirty";
import Color from "@/core/Math/Color";
import ShadowLight from "./ShadowLight";
import { mat4 } from "wgpu-matrix";

export default class SunLight extends ShadowLight {
    static readonly castShadow = true;
    
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
        const data = new Float32Array(Light.MEMORY_SIZE);
        data.set([
            this.direction.x,
            this.direction.y,
            this.direction.z,
            0,
            this.color.r,
            this.color.g,
            this.color.b,
            Light.Types.Sun,
            this.intensity
        ], 0);

        data.set(this.lightMatrix, 24);

        return data;
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

    get lightMatrix(): Float32Array {
        /*const [dx, dy, dz] = this.direction.asBuffer;
        
        const lightViewMatrix = mat4.lookAt([dx * -10, dy * -10, dz * -10], this.direction.asBuffer, [0, 1, 0]);
        const lightProjectionMatrix = mat4.ortho(-100, 100, -100, 100, 1, 100); // DUMMY
        return mat4.multiply(lightProjectionMatrix, lightViewMatrix) as Float32Array;*/

        const lightViewMatrix = mat4.lookAt([0, 7, -12], [0, 0, 0], [0, 1, 0]);
        const lightProjectionMatrix = mat4.perspective(45 / 180 * Math.PI, 1, 1, 100);
        return mat4.multiply(lightProjectionMatrix, lightViewMatrix) as Float32Array;
    }
}