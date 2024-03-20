import { mat4 } from "wgpu-matrix";
import Camera from "./Camera";
import dirty from "@/util/dirty";
import Vector3 from "../Math/Vector3";

export default class PerspectiveCamera extends Camera {
    private static readonly up = new Vector3(0, 1, 0); 
    
    target = new Vector3(0, 0, 1);

    @dirty declare fov: number;
    @dirty declare aspect: number;
    @dirty declare near: number;
    @dirty declare far: number;

    constructor(fov: number, aspect: number, near: number, far: number) {
        super();
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    get viewProjectionMatrix() {
        const viewMatrix = mat4.lookAt(this.position.asBuffer, this.target.asBuffer, PerspectiveCamera.up.asBuffer);
        const projectionMatrix = mat4.perspective(this.fov, this.aspect, this.near, this.far);
        const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);
        return viewProjectionMatrix as Float32Array;
    }
}