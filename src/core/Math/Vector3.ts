import dirty from "@/util/dirty";
import { vec3 } from "wgpu-matrix";

export default class Vector3 {
    @dirty declare x: number;
    @dirty declare y: number;
    @dirty declare z: number;
    declare dirty: boolean;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x: number, y: number, z: number): Vector3 {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    copy(other: Vector3): Vector3 {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        return this;
    }

    neg() {
        return new Vector3(-this.x, -this.y, -this.z);
    }

    translate(x: number, y: number, z: number): void {
        this.x += x;
        this.y += y;
        this.z += z;
    }

    get len(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    get lenSq(): number {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    get normalized(): Vector3 {
        const len = this.len;
        return new Vector3(this.x / len, this.y / len, this.z / len);
    }

    get asBuffer(): Float32Array {
        return vec3.fromValues(this.x, this.y, this.z) as Float32Array;
    }
}