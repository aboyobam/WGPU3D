import dirty from "@/util/dirty";
import { Quat, quat } from "wgpu-matrix";
import Vector3 from "./Vector3";

export default class Quaternion {
    @dirty declare x: number;
    @dirty declare y: number;
    @dirty declare z: number;
    @dirty declare w: number;
    declare dirty: boolean;

    static random() {
        const [x, y, z, w] = quat.fromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 'xyz');
        return new Quaternion(x, y, z, w);
    }

    constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    set(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    copy(other: Quaternion) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
        this.w = other.w;
    }

    toAngleAxis(): [number, Vector3] {
        const { angle, axis } = quat.toAxisAngle(this.asQuat);
        return [angle, new Vector3(axis[0], axis[1], axis[2])];
    }

    rotateX(angle: number): void {
        const q = quat.create();
        quat.rotateX(this.asQuat, angle, q);
        this.x = q[0];
        this.y = q[1];
        this.z = q[2];
        this.w = q[3];
    }

    rotateY(angle: number): void {
        const q = quat.create();
        quat.rotateY(this.asQuat, angle, q);
        this.x = q[0];
        this.y = q[1];
        this.z = q[2];
        this.w = q[3];
    }

    rotateZ(angle: number): void {
        const q = quat.create();
        quat.rotateZ(this.asQuat, angle, q);
        this.x = q[0];
        this.y = q[1];
        this.z = q[2];
        this.w = q[3];
    }

    get asQuat(): Quat {
        return quat.fromValues(this.x, this.y, this.z, this.w);
    }
}