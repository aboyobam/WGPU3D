import UniformBindGroup from "@/types/UniformBindGroup";
import Light from "./Light";
import Camera from "@/core/Camera/Camera";

export default class ShadowLight extends Light implements UniformBindGroup {
    static readonly castShadow: boolean = true;

    update(): void {
        if (!this.dirty) {
            return;
        }

        this.device.queue.writeBuffer(this.lightMatrixBuffer, 0, this.lightMatrix);
        this.clean();
    }

    private bindGroup: GPUBindGroup;
    private lightMatrixBuffer: GPUBuffer;
    private device: GPUDevice;

    get lightMatrix(): Float32Array {
        throw new Error("Cannot use base shadow light class");
    }

    getBindGroup(device: GPUDevice): GPUBindGroup {
        if (this.bindGroup) {
            return this.bindGroup;
        }

        this.lightMatrixBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.bindGroup = device.createBindGroup({
            layout: Camera.getBindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.lightMatrixBuffer
                    }
                }
            ]
        });

        this.device = device;

        this.dirty = true;
        this.update();
        return this.bindGroup;
    }
}