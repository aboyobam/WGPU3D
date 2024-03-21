import dirty from "@/util/dirty";
import Camera from "./Camera";
import { mat4 } from "wgpu-matrix";
import Vector3 from "../Math/Vector3";

export default class OrthographicCamera extends Camera {
    private static readonly up = new Vector3(0, 1, 0); 
    
    @dirty declare left: number;
    @dirty declare right: number;
    @dirty declare top: number;
    @dirty declare bottom: number;
    @dirty declare near: number;
    @dirty declare far: number;
    
    target = new Vector3(0, 0, 1);

    constructor(left: number, right: number, top: number, bottom: number, near: number) {
        super();
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.near = near;
        this.far = 1000;
    }

    get viewProjectionMatrix() {
        const viewMatrix = mat4.lookAt(this.position.asBuffer, this.target.asBuffer, OrthographicCamera.up.asBuffer);
        const projectionMatrix = mat4.ortho(this.left, this.right, this.bottom, this.top, this.near, this.far);
        const viewProjectionMatrix = mat4.multiply(projectionMatrix, viewMatrix);
        return viewProjectionMatrix as Float32Array;
    }
}