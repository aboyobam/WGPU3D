import Scene from "@/core/Scene";
import Extension from "./Extension";
import Renderer from "@/core/Renderer";
import Camera from "@/core/Camera/Camera";
import Transform from "@/core/Math/Transform";
import shadowVertexCode from "./shadow.vertex.wgsl";
import ShadowLight from "@/lights/ShadowLight";
import DrawOperation from "@/core/DrawOperation";

class ShadowRendererSceneExtension extends Extension<Scene> {
    constructor(public readonly shadowPass: ShadowPass) {
        super();
    }

    shadowDepthTextureView: GPUTextureView;
    private shadowDepthTexture: GPUTexture;

    initialized = false;
    private setup(scene: Scene, device: GPUDevice) {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        this.shadowDepthTexture = device.createTexture({
            label: 'shadow-depth-texture',
            size: {
                width: this.shadowPass.shadowTextureSize * scene.maxNumLights,
                height: this.shadowPass.shadowTextureSize,
                depthOrArrayLayers: 1,
            },
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
            format: 'depth32float',
        });
        this.shadowDepthTextureView = this.shadowDepthTexture.createView({
            label: 'shadow-depth-texture-view',
        });
    }

    init(): void {
        this.pre("mount", device => {
            if (this.initialized) {
                return;
            }

            this.setup(this.__host, device);
            this.__host.shadowTextureView = this.shadowDepthTextureView;
        });
    }
}

class ShadowRendererExtension extends Extension<Renderer> {
    constructor(private readonly shadowPass: ShadowPass) {
        super();
    }

    private shadowPipeline: GPURenderPipeline;
    private shadowPassDescriptor: GPURenderPassDescriptor;

    private setup() {
        if (this.shadowPassDescriptor) {
            return;
        }
        
        if (!this.shadowPass.sceneExtension.initialized) {
            console.warn("ShadowPass.SceneExtension is present on the Scene");
            return;
        }
        

        this.shadowPipeline = this.__host.device.createRenderPipeline({
            layout: this.__host.device.createPipelineLayout({
              bindGroupLayouts: [
                Camera.getBindGroupLayout(this.__host.device), // camera
                Transform.getBindGroupLayout(this.__host.device), // model
              ],
            }),
            vertex: {
                module: this.__host.device.createShaderModule({ code: shadowVertexCode }),
                entryPoint: 'main',
                buffers: Renderer.vertexBuffers
            },
            depthStencil: {
              depthWriteEnabled: true,
              depthCompare: 'less',
              format: 'depth32float',
            },
            primitive: Renderer.primitiveState,
        });

        this.shadowPassDescriptor = {
            colorAttachments: [],
            depthStencilAttachment: {
              view: this.shadowPass.sceneExtension.shadowDepthTextureView,
              depthClearValue: 1.0,
              depthLoadOp: 'clear',
              depthStoreOp: 'store',
            },
        };
    }

    init(): void {
        this.pre("beginRender", (commandEncoder, scene, camera) => {
            this.setup();

            if (!this.shadowPassDescriptor) {
                return;
            }

            const lights = Array.from(scene.readObjects(ShadowLight));
            if (!lights.length) {
                return;
            }

            const shadowEncoder = commandEncoder.beginRenderPass(this.shadowPassDescriptor);

            shadowEncoder.setPipeline(this.shadowPipeline);
            
            for (let index = 0; index < lights.length; index++) {
                shadowEncoder.setBindGroup(0, lights[index].getBindGroup(this.__host.device));
                // shadowEncoder.setBindGroup(0, camera.getBindGroup(this.__host.device));

                const drawOp = new DrawOperation({
                    viewBgAccessor: lights[index] ,
                    device: this.__host.device,
                    renderPass: shadowEncoder,
                    scene: scene,
                    vertexShader: null,
                    useMaterials: false,
                    renderer: this.__host,
                    commandEncoder
                }, "shadowPass");

                // shadowEncoder.setViewport(index * this.shadowPass.shadowTextureSize, 0, this.shadowPass.shadowTextureSize, this.shadowPass.shadowTextureSize, 0, 1);
                this.__host.renderObjects(drawOp, scene);
            }

            shadowEncoder.end();
        });
    }
}

export default class ShadowPass {
    constructor(public readonly shadowTextureSize: number) {}

    private _sceneExtension: ShadowRendererSceneExtension;
    static ShadowRendererSceneExtension = ShadowRendererSceneExtension;
    static ShadowRendererExtension = ShadowRendererExtension;

    get sceneExtension() {
        if (!this._sceneExtension) {
            this._sceneExtension = new ShadowRendererSceneExtension(this);
        }

        return this._sceneExtension;
    }

    private _rendererExtension: ShadowRendererExtension;
    get rendererExtension() {
        if (!this._rendererExtension) {
            this._rendererExtension = new ShadowRendererExtension(this);
        }

        return this._rendererExtension;
    }
}

