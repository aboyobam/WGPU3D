import Material from "@/materials/Material";
import Scene from "./Scene";
import Camera from "./Camera/Camera";
import Transform from "./Math/Transform";

export default class DrawOperation {
    readonly device: GPUDevice;
    readonly renderPassStack: (GPURenderPassEncoder | GPURenderBundleEncoder)[];
    readonly scene: Scene;
    readonly camera: Camera;
    readonly vertexShader: GPUVertexState;
    private _materialMountedCallbacks: Set<() => void> = new Set();

    constructor(options: DrawOperationOptions) {
        this.device = options.device;
        this.renderPassStack = [options.renderPass];
        this.scene = options.scene;
        this.camera = options.camera;
        this.vertexShader = options.vertexShader;
    }

    onMaterialMounted(callback: () => void) {
        this._materialMountedCallbacks.add(callback);
        return () => this._materialMountedCallbacks.delete(callback);
    }

    useMaterial(material: Material): boolean {
        const mountedListeners = Array.from(this._materialMountedCallbacks);
        material.MaterialClass.mount(this.device, this.vertexShader, [
            Camera.getBindGroupLayout(this.device), // camera
            Transform.getBindGroupLayout(this.device), // transform
        ], () => {
            for (const listener of mountedListeners) {
                listener();
            }
        });

        return material.use(this);
    };

    get renderPass(): GPURenderPassEncoder | GPURenderBundleEncoder {
        return this.renderPassStack[this.renderPassStack.length - 1];
    }

    getRenderPass<T extends GPURenderPassEncoder | GPURenderBundleEncoder>(): T {
        return this.renderPass as T;
    }

    pushRenderPass(renderPass: GPURenderPassEncoder | GPURenderBundleEncoder) {
        this.renderPassStack.push(renderPass);
        renderPass.setBindGroup(0, this.camera.getBindGroup(this.device));
    }

    popRenderPass() {
        this.renderPassStack.pop();
    }

    executeBundle(bundle: GPURenderBundle) {
        this.getRenderPass<GPURenderPassEncoder>().executeBundles([bundle]);
        this.renderPass.setBindGroup(0, this.camera.getBindGroup(this.device));
    }
}

interface DrawOperationOptions {
    device: GPUDevice;
    renderPass: GPURenderPassEncoder | GPURenderBundleEncoder;
    scene: Scene;
    camera: Camera;
    vertexShader: GPUVertexState;
}