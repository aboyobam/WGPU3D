import Scene from "@/core/Scene";
import Renderer from "../core/Renderer";
import DrawOperation from "@/core/DrawOperation";

export default abstract class Material {
    protected static getFragmentShader(_drawOp: DrawOperation): GPUFragmentState {
        throw new Error("Use subclass of Material");
    };

    static mounted = new Map<typeof Material, GPURenderPipeline>();
    static mounting = new Map<typeof Material, Promise<void>>();
    
    get MaterialClass(): typeof Material {
        return this.constructor as typeof Material;
    }

    static mount(drawOp: DrawOperation, layouts: GPUBindGroupLayout[], callback?: () => void) {
        if (Material.mounting.has(this)) {
            if (callback && !Material.mounted.has(this)) {
                Material.mounting.get(this).then(() => {
                    callback();
                });
            }
            return;
        }

        const create = drawOp.device.createRenderPipelineAsync({
            layout: drawOp.device.createPipelineLayout({
                bindGroupLayouts: layouts
            }),
            vertex: drawOp.vertexShader,
            depthStencil: {
                format: Renderer.depthStencilFormat,
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            fragment: this.getFragmentShader(drawOp),
            primitive: Renderer.primitiveState
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