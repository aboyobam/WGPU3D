import Light from "@/lights/Light";
import BasicMaterial from "./BasicMaterial";
import fragmentShader from "./Standart.frag.wgsl";
import Material from "./Material";
import DrawOperation from "@/core/DrawOperation";
import Renderer from "@/core/Renderer";
import ShadowPass from "@/extensions/ShadowPass";

export default class StandartMaterial extends BasicMaterial {
    static mount(drawOp: DrawOperation, layouts: GPUBindGroupLayout[], callback?: () => void) {
        Material.mount.call(this, drawOp, [
            ...layouts,
            BasicMaterial.getImageBindingGroupLayout(drawOp.device),
            Light.getBindGroupLayout(drawOp.device)
        ], callback);
    }

    protected static getFragmentShader(drawOp: DrawOperation): GPUFragmentState {
        const shadowExt = drawOp.scene.getExtension(ShadowPass.ShadowRendererSceneExtension);
        console.log(shadowExt);

        return {
            module: drawOp.device.createShaderModule({ code: fragmentShader, }),
            targets: [{ format: Renderer.presentationFormat }],
            entryPoint: "main",
            constants: {
                hasShadowMap: shadowExt ? 1 : 0,
                shadowDepthTextureSize: shadowExt?.shadowPass.opts.shadowTextureSize ?? 1,
                mapsX: shadowExt?.mapsX ?? 1,
                mapsY: shadowExt?.mapsY ?? 1,
                maxNumLights: drawOp.scene.maxNumLights
            }
        };
    }

    use(drawOp: DrawOperation): boolean {
        if (!super.use(drawOp)) {
            return false;
        }

        drawOp.renderPass.setBindGroup(3, drawOp.scene.lightBindGroup);

        return true;
    }
}