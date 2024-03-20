import Mesh from "./Mesh";
import Renderer from "../Renderer";
import DrawOperation from "../DrawOperation";

export default class BundleMesh extends Mesh {
    private readonly meshes = new Set<Mesh>();
    private needsUpdate = true;
    private bundle: GPURenderBundle;

    draw(drawOp: DrawOperation): void {
        if (this.needsUpdate) {
            this.updateBundle(drawOp);
        }

        drawOp.executeBundle(this.bundle);
    }

    add(...meshes: Mesh[]) {
        for (const mesh of meshes) {
            if (mesh instanceof BundleMesh) {
                throw new Error("Cannot add a BundleMesh to another BundleMesh");
            }

            if (mesh.parent) {
                const index = mesh.parent.children.indexOf(mesh);
                if (index !== -1) {
                    mesh.parent.children.splice(index, 1);
                }
            }

            mesh.parent = this;
            mesh.transform.parent = this.transform;
            this.meshes.add(mesh);
        }

        this.needsUpdate = true;
    }

    remove(...meshes: Mesh[]) {
        for (const mesh of meshes) {
            this.meshes.delete(mesh);
            mesh.parent = null;
        }

        this.needsUpdate = true;
    }

    clone() {
        const mesh = new BundleMesh();
        for (const child of this.meshes) {
            mesh.add(child.clone());
        }

        mesh.transform.copy(this.transform);

        return mesh;
    }

    private updateBundle(drawOp: DrawOperation) {
        const bundleEncoder = drawOp.device.createRenderBundleEncoder({
            colorFormats: [Renderer.presentationFormat],
            depthStencilFormat: Renderer.depthStencilFormat,
            sampleCount: 1
        });

        drawOp.pushRenderPass(bundleEncoder);
        const onMaterialMounted = drawOp.onMaterialMounted(() => {
            this.needsUpdate = true;
        });
        for (const mesh of this.meshes) {
            mesh.draw(drawOp);
        }
        onMaterialMounted();
        drawOp.popRenderPass();
        
        this.needsUpdate = false;
        this.bundle = bundleEncoder.finish();
    }
}