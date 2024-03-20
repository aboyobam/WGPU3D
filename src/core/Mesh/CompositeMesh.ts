import Material from "@/materials/Material";
import Geometry from "../Geometry/Geometry";
import Vertex from "@/types/Vertex";
import Mesh from "./Mesh";
import UseMaterial from "@/types/UseMaterial";
import DrawOperation from "../DrawOperation";

export default class CompositeMesh extends Mesh {
    _isMesh = true;

    constructor(private readonly parts: Vertex[][], public readonly materials: Material[]) {
        super(new Geometry(parts.flat()));
        this.transform.renderable = true;

        if (parts.length !== materials.length) {
            throw new Error("parts and materials must be the same length");
        }
    }

    draw(drawOp: DrawOperation): void {
        let offset = 0;
        this.geometry.mount(drawOp.device);
        drawOp.renderPass.setBindGroup(1, this.getTransformBindGroup(drawOp.device));
        drawOp.renderPass.setVertexBuffer(0, this.geometry.vertexBuffer);
        drawOp.renderPass.setIndexBuffer(this.geometry.indexBuffer, "uint16");

        for (let i = 0; i < this.parts.length; i++) {
            const canUse = drawOp.useMaterial(this.materials[i]);

            if (canUse) {
                drawOp.renderPass.drawIndexed(this.parts[i].length, 1, offset, 0, 0);
            }

            offset += this.parts[i].length;
        }
    }

    clone() {
        const mesh = new CompositeMesh(this.parts, this.materials);
        mesh.transform.copy(this.transform);
        return mesh;
    }
}