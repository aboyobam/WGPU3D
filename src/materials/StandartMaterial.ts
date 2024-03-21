import Light from "@/lights/Light";
import BasicMaterial from "./BasicMaterial";
import fragmentShader from "./Standart.frag.wgsl";
import Material from "./Material";
import DrawOperation from "@/core/DrawOperation";
import ShadowPass from "@/extensions/ShadowPass";

export default class StandartMaterial extends BasicMaterial {
    static readonly fragmentShader = fragmentShader;

    static mount(device: GPUDevice, vertex: GPUVertexState, layouts: GPUBindGroupLayout[], callback?: () => void) {
        Material.mount.call(this, device, vertex, [
            ...layouts,
            BasicMaterial.getImageBindingGroupLayout(device),
            Light.getBindGroupLayout(device)
        ], callback);
    }

    use(drawOp: DrawOperation): boolean {
        if (!super.use(drawOp)) {
            return false;
        }

        drawOp.renderPass.setBindGroup(3, drawOp.scene.lightBindGroup);

        return true;
    }
}