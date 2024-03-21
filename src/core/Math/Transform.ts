import { mat4 } from "wgpu-matrix";
import Quaternion from "./Quaternion";
import Vector3 from "./Vector3";
import UniformBindGroup from "@/types/UniformBindGroup";

export default class Transform implements UniformBindGroup {
    readonly position: Vector3 = new Vector3();
    readonly scale: Vector3 = new Vector3(1, 1, 1);
    readonly rotation: Quaternion = new Quaternion();

    private bindGroup: GPUBindGroup;
    private gpuBuffer: GPUBuffer;
    private device: GPUDevice;
    parent: Transform;

    constructor(public renderable: boolean = false) {}

    private static bindGroupLayout: GPUBindGroupLayout;
    static getBindGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (this.bindGroupLayout) {
            return this.bindGroupLayout;
        }

        this.bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });

        return this.bindGroupLayout;
    }

    getBindGroup(device: GPUDevice): GPUBindGroup {
        if (!this.renderable) {
            throw new Error("Transform is not renderable");
        }

        if (this.bindGroup) {
            return this.bindGroup;
        }

        this.gpuBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = device.createBindGroup({
            layout: Transform.getBindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.gpuBuffer
                    }
                }
            ]
        });

        this.device = device;
        this.update();

        return this.bindGroup;
    }

    update() {
        if (!this.renderable) {
            this.clean();
            return;
        }

        if (!this.device || !this.isDirty) {
            return;
        }
        
        this.clean();
        this.device.queue.writeBuffer(this.gpuBuffer, 0, this.asBuffer);
    }

    copy(t: Transform) {
        this.position.copy(t.position);
        this.scale.copy(t.scale);
        this.rotation.copy(t.rotation);
    }

    identity() {
        this.copy(new Transform());
    }

    get asBuffer(): Float32Array {
        const mat = mat4.identity();
        const [angle, axis] = this.rotation.toAngleAxis();
        mat4.rotate(mat, axis.asBuffer, angle, mat);
        mat4.setTranslation(mat, this.position.asBuffer, mat);
        mat4.scale(mat, this.scale.asBuffer, mat);

        if (this.parent) {
            mat4.multiply(this.parent.asBuffer, mat, mat);
        }
        
        return mat as Float32Array;
    }

    get isDirty(): boolean {
        return this.parent?.isDirty || this.position.dirty || this.scale.dirty || this.rotation.dirty;
    }

    clean() {
        this.position.dirty = false;
        this.scale.dirty = false;
        this.rotation.dirty = false;
    }
}