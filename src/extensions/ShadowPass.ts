import Scene from "@/core/Scene";
import Extension from "./Extension";
import Renderer from "@/core/Renderer";
import Camera from "@/core/Camera/Camera";
import Transform from "@/core/Math/Transform";
import shadowVertexCode from "./shadow.vertex.wgsl";
import ShadowLight from "@/lights/ShadowLight";
import DrawOperation from "@/core/DrawOperation";

export default class ShadowPass {
    constructor(public readonly shadowTextureSize: number) {}

    private _sceneExtension: ShadowRendererSceneExtension;
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

class ShadowRendererSceneExtension extends Extension<Scene> {
    constructor(private readonly shadowPass: ShadowPass) {
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
            size: [this.shadowPass.shadowTextureSize * scene.maxNumLights, this.shadowPass.shadowTextureSize, 1],
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC, // DUMMY COPY_SRC
            format: 'depth32float',
        });
        this.shadowDepthTextureView = this.shadowDepthTexture.createView();
    }

    init(): void {
        this.pre("mount", device => {
            if (this.initialized) {
                return;
            }

            this.setup(this.__host, device);
            this.__host.shadowTextureView = this.shadowDepthTextureView;
            console.log("mount shadow texture view");
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
        if (this.shadowPassDescriptor || !this.shadowPass.sceneExtension.initialized) {
            return;
        }

        this.shadowPipeline = this.__host.device.createRenderPipeline({
            layout: this.__host.device.createPipelineLayout({
              bindGroupLayouts: [
                Camera.getBindGroupLayout(this.__host.device), // camera
                Transform.getBindGroupLayout(this.__host.device),
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

            const lights = Array.from(scene.readObjects(ShadowLight));
            if (!lights.length) {
                return;
            }

            const shadowEncoder = commandEncoder.beginRenderPass(this.shadowPassDescriptor);
            shadowEncoder.setPipeline(this.shadowPipeline);
            
            for (let index = 0; index < lights.length; index++) {
                // shadowEncoder.setBindGroup(0, camera.getBindGroup(this.__host.device));
                shadowEncoder.setBindGroup(0, lights[index].getBindGroup(this.__host.device));
                
                const drawOp = new DrawOperation({
                    viewBgAccessor: lights[index],
                    device: this.__host.device,
                    renderPass: shadowEncoder,
                    scene: scene,
                    vertexShader: null,
                    useMaterials: false,
                    renderer: this.__host,
                    commandEncoder
                }, "shadowPass");

                shadowEncoder.setViewport(index * this.shadowPass.shadowTextureSize, 0, this.shadowPass.shadowTextureSize, this.shadowPass.shadowTextureSize, 0, 1);
                this.__host.renderObjects(drawOp, scene);
            }

            shadowEncoder.end();
        });
    }
}