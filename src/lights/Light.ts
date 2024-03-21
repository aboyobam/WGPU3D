import Object3D from "../core/Object3D";

enum LightType {
    Ambient = 0,
    Directional = 1,
    Spot = 2,
    Point = 3,
    Sun = 4
}

export default class Light extends Object3D {
    static readonly Types = LightType;
    static readonly MEMORY_SIZE = 40;
    
    _isLight = true;
    declare dirty: boolean;

    private static bindGroupLayout: GPUBindGroupLayout;
    static getBindGroupLayout(device: GPUDevice) {
        if (this.bindGroupLayout) {
            return this.bindGroupLayout;
        }

        this.bindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "uniform"
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage"
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: "depth"
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {
                        type: "comparison"
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: "read-only-storage"
                    }
                }
            ]
        });

        return this.bindGroupLayout;
    }

    get asBuffer(): Float32Array {
        throw new Error("Use a Subclass of Light");
    }

    get isDirty(): boolean {
        throw new Error("Use a Subclass of Light");
    }

    clean() {
        throw new Error("Use a Subclass of Light");
    }

    get LightClass(): typeof Light {
        return this.constructor as typeof Light;
    }
}