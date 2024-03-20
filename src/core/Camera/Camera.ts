import Object3D from "../Object3D";

export default class Camera extends Object3D {
    _isCamera = true;

    get viewProjectionMatrix(): Float32Array {
        throw new Error("Cannot use base camera class");
    };
    private static bindGroupLayout: GPUBindGroupLayout;
    static getBindGroupLayout(device: GPUDevice) {
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
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                }
            ]
        });

        return this.bindGroupLayout;
    }

    private bindGroup: GPUBindGroup;
    private positionBuffer: GPUBuffer;
    private viewMatrixBuffer: GPUBuffer;
    private device: GPUDevice;
    declare dirty: boolean;

    getBindGroup(device: GPUDevice) {
        if (this.bindGroup) {
            return this.bindGroup;
        }

        this.viewMatrixBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.positionBuffer = device.createBuffer({
            size: 4 * Float32Array.BYTES_PER_ELEMENT, // vec4f
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        const bindGroupLayout = Camera.getBindGroupLayout(device);

        this.bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.viewMatrixBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.positionBuffer
                    }
                }
            ]
        });

        this.device = device;
        this.update();

        return this.bindGroup;
    }

    update() {
        if (!this.device || !this.isDirty) {
            return;
        }

        this.clean();
        console.log("Updating camera");
        this.device.queue.writeBuffer(this.positionBuffer, 0, this.transform.position.asBuffer);
        this.device.queue.writeBuffer(this.viewMatrixBuffer, 0, this.viewProjectionMatrix);
    }

    get isDirty(): boolean {
        return this.dirty || this.transform.isDirty;
    }

    clean() {
        this.dirty = false;
        this.transform.clean();
    }
}