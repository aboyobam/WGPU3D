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

    mount(device: GPUDevice) {
        if (this.lightBindGroup) {
            this.updateLights(device);
            return;
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

        console.log("Updating lights");
        device.queue.writeBuffer(this.lightCountBuffer, 0, new Uint32Array([lights.length]));

        const lightData = new Float32Array(this.lightBuffer.size / Float32Array.BYTES_PER_ELEMENT);
        lightData.fill(0);
        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];
            lightData.set(light.asBuffer, i * 24);
        }
        device.queue.writeBuffer(this.lightBuffer, 0, lightData);
    }
}

interface SceneOptions {
    maxNumLights: number;
}