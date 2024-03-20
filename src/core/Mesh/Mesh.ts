import Material from "@/materials/Material";
import Geometry from "../Geometry/Geometry";
import Object3D from "../Object3D";
import DrawOperation from "../DrawOperation";

export default class Mesh extends Object3D {
    _isMesh = true;
    protected readonly renderable: boolean = true;

    private transformBindGroup: GPUBindGroup;

    constructor(public readonly geometry?: Geometry, public readonly material?: Material) {
        super();
        this.transform.renderable = true;
    }

    getTransformBindGroup(device: GPUDevice) {
        if (this.transformBindGroup) {
            return this.transformBindGroup;
        }

        this.transformBindGroup = this.transform.getBindGroup(device);

        return this.transformBindGroup;
    }

    draw(drawOp: DrawOperation): void {
        if (!this.geometry || !this.material) {
            return;
        }

        const canUse = drawOp.useMaterial(this.material);

        if (canUse) {
            this.geometry.mount(drawOp.device);
            drawOp.renderPass.setBindGroup(1, this.getTransformBindGroup(drawOp.device));
            drawOp.renderPass.setVertexBuffer(0, this.geometry.vertexBuffer);
            drawOp.renderPass.setIndexBuffer(this.geometry.indexBuffer, "uint16");
            drawOp.renderPass.drawIndexed(this.geometry.indexCount, 1, 0, 0, 0);
        }
    }

    clone() {
        const mesh = new Mesh(this.geometry, this.material);
        mesh.transform.copy(this.transform);

        return mesh;
    }
}