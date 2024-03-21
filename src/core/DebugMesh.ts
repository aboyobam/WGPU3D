import ShadowDepthMaterial from "@/materials/ShadowDepthMaterial";
import DrawOperation from "./DrawOperation";
import Mesh from "./Mesh/Mesh";

export default class DebugMesh extends Mesh {
    material = new ShadowDepthMaterial();
    
    constructor() {
        super();
    }

    draw(drawOp: DrawOperation): void {
        if (drawOp.label == "shadowPass") {
            return;
        }

        const canUse = drawOp.useMaterial(this.material);
        if (canUse) {
            drawOp.renderPass.drawIndexed(6);            
        }
    }
}