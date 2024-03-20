import Scene from "@/core/Scene";
import Renderer from "../core/Renderer";
import DrawOperation from "@/core/DrawOperation";

export default abstract class Material {
    protected static readonly fragmentShader: string;
    private static mounted = new Map<typeof Material, GPURenderPipeline>();
    private static mounting = new Map<typeof Material, Promise<void>>();
    
    get MaterialClass(): typeof Material {
        return this.constructor as typeof Material;
    }

    static mount(device: GPUDevice, vertex: GPUVertexState, layouts: GPUBindGroupLayout[], callback?: () => void) {
        if (Material.mounting.has(this)) {
            if (callback && !Material.mounted.has(this)) {
                Material.mounting.get(this).then(() => {
                    callback();
                });
            }
            return;
        }

        const create = device.createRenderPipelineAsync({
            layout: device.createPipelineLayout({
                bindGroupLayouts: layouts
            }),
            vertex,
            depthStencil: {
                format: Renderer.depthStencilFormat,
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            fragment: {
                module: device.createShaderModule({ code: this.fragmentShader }),
                targets: [{ format: Renderer.presentationFormat }],
                entryPoint: "main"
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back"
            }
        }).then(pipeline => {
            Material.mounted.set(this, pipeline);
            callback?.();
        });

        Material.mounting.set(this, create);
    }

    use(drawOp: DrawOperation): boolean {
        const pipeline = Material.mounted.get(this.MaterialClass);
        if (!pipeline) {
            return false;
        }

        drawOp.renderPass.setPipeline(pipeline);
        return true;
    }
}