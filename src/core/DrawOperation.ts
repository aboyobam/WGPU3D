import Material from "@/materials/Material";
import Scene from "./Scene";
import Camera from "./Camera/Camera";
import Transform from "./Math/Transform";
import UniformBindGroup from "@/types/UniformBindGroup";
import Renderer from "./Renderer";

export default class DrawOperation {
    readonly device: GPUDevice;
    readonly renderPassStack: (GPURenderPassEncoder | GPURenderBundleEncoder)[];
    readonly scene: Scene;
    readonly viewBgAccessor: UniformBindGroup;
    readonly vertexShader: GPUVertexState;
    readonly renderer: Renderer;
    readonly commandEncoder: GPUCommandEncoder;

    private readonly useMaterials: boolean;
    private _materialMountedCallbacks: Set<() => void> = new Set();

    constructor(options: DrawOperationOptions, public readonly label?: string) {
        this.device = options.device;
        this.renderPassStack = [options.renderPass];
        this.scene = options.scene;
        this.viewBgAccessor = options.viewBgAccessor;
        this.vertexShader = options.vertexShader;
        this.useMaterials = options.useMaterials;
        this.renderer = options.renderer;
        this.commandEncoder = options.commandEncoder;
    }

    onMaterialMounted(callback: () => void) {
        this._materialMountedCallbacks.add(callback);
        return () => this._materialMountedCallbacks.delete(callback);
    }

    useMaterial(material: Material): boolean {
        if (!this.useMaterials) {
            return true;
        }
        
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
        renderPass.setBindGroup(0, this.viewBgAccessor.getBindGroup(this.device));
    }

    popRenderPass() {
        this.renderPassStack.pop();
    }

    executeBundle(bundle: GPURenderBundle) {
        this.getRenderPass<GPURenderPassEncoder>().executeBundles([bundle]);
        this.renderPass.setBindGroup(0, this.viewBgAccessor.getBindGroup(this.device));
    }
}

interface DrawOperationOptions {
    device: GPUDevice;
    renderPass: GPURenderPassEncoder | GPURenderBundleEncoder;
    scene: Scene;
    viewBgAccessor: UniformBindGroup;
    vertexShader: GPUVertexState;
    useMaterials: boolean;
    renderer: Renderer;
    commandEncoder: GPUCommandEncoder;
}