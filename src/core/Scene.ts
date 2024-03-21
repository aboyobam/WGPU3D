import Light from "@/lights/Light";
import Object3D from "./Object3D";

export default class Scene extends Object3D {
    _isScene: boolean = true;
    
    constructor(private readonly opts: SceneOptions) {
        super();
    }

    lightBindGroup: GPUBindGroup;
    private lightBuffer: GPUBuffer;
    private lightCountBuffer: GPUBuffer;
    shadowTextureView: GPUTextureView;

    mount(device: GPUDevice) {
        if (this.lightBindGroup) {
            this.updateLights(device);
            return;
        }

        if (!this.shadowTextureView) {
            const shadowTexture = device.createTexture({
                label: "fallback-shadow-texture",
                size: { width: 1, height: 1, depthOrArrayLayers: 1 },
                format: "depth32float",
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });
            this.shadowTextureView = shadowTexture.createView();
        }

        this.lightCountBuffer = device.createBuffer({
            size: Uint32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.lightBuffer = device.createBuffer({
            size: this.opts.maxNumLights * Light.MEMORY_SIZE * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.lightBindGroup = device.createBindGroup({
            layout: Light.getBindGroupLayout(device),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.lightCountBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.lightBuffer
                    }
                },
                {
                    binding: 2,
                    resource: this.shadowTextureView
                },
                {
                    binding: 3,
                    resource: device.createSampler({
                        compare: "less"
                    })
                }
            ]
        });

        this.updateLights(device);
    }

    updateLights(device: GPUDevice) {
        const lights = Array.from(this.readObjects(Light));

        if (!lights.some(light => light.isDirty)) {
            return;
        }

        lights.forEach(light => {
            light.clean();
        });

        device.queue.writeBuffer(this.lightCountBuffer, 0, new Uint32Array([lights.length]));

        const lightData = new Float32Array(this.lightBuffer.size / Float32Array.BYTES_PER_ELEMENT);
        lightData.fill(0);
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            lightData.set(light.asBuffer, i * Light.MEMORY_SIZE);
        }
        device.queue.writeBuffer(this.lightBuffer, 0, lightData);
    }

    get maxNumLights() {
        return this.opts.maxNumLights;
    }
}

interface SceneOptions {
    maxNumLights: number;
}