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

    mapsX: number;
    mapsY: number;

    initialized = false;
    private setup(device: GPUDevice, scene: Scene) {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        const numX = Math.ceil(Math.sqrt(scene.maxNumLights));
        const numY = Math.ceil(scene.maxNumLights / numX);
        this.mapsX = numX;
        this.mapsY = numY;

        this.shadowDepthTexture = device.createTexture({
            label: 'shadow-depth-texture',
            size: {
                width: this.shadowPass.opts.shadowTextureSize * numX,
                height: this.shadowPass.opts.shadowTextureSize * numY,
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

            this.setup(device, this.__host);
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
            primitive: {
                cullMode: "none",
                topology: "triangle-list",
            },
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

            let lights: ShadowLight[];

            if (this.shadowPass.opts.updateStrategy === "everyFrame") {
                this.shadowPass.update();
            } else if (this.shadowPass.opts.updateStrategy === "whenDirty") {
                lights = Array.from(scene.readObjects(ShadowLight));
                if (!lights.length || !lights.some(light => light.isDirty)) {
                    return;
                } 
            } else if (this.shadowPass.opts.updateStrategy === "manual") {
                if (!this.shadowPass.toUpdate?.length) {
                    return;
                }
            }

            lights ??= Array.from(scene.readObjects(ShadowLight));
            if (!lights.length) {
                return;
            }

            const shadowEncoder = commandEncoder.beginRenderPass(this.shadowPassDescriptor);

            shadowEncoder.setPipeline(this.shadowPipeline);
            
            for (let index = 0; index < lights.length; index++) {
                const light = lights[index];
                if (!light.castShadow || !this.shadowPass.toUpdate.includes(light)) {
                    continue;
                }

                shadowEncoder.setBindGroup(0, light.getBindGroup(this.__host.device));

                const drawOp = new DrawOperation({
                    viewBgAccessor: light,
                    device: this.__host.device,
                    renderPass: shadowEncoder,
                    scene: scene,
                    vertexShader: null,
                    useMaterials: false,
                    renderer: this.__host,
                    commandEncoder,
                    filter: (object) => !object.isMesh() || object.castShadow
                }, "shadowPass");

                const mx = index % this.shadowPass.sceneExtension.mapsX;
                const my = Math.floor(index / this.shadowPass.sceneExtension.mapsX);

                shadowEncoder.setViewport(
                    this.shadowPass.opts.shadowTextureSize * mx,
                    this.shadowPass.opts.shadowTextureSize * my,
                    this.shadowPass.opts.shadowTextureSize,
                    this.shadowPass.opts.shadowTextureSize,
                    0, 1
                );
                this.__host.renderObjects(drawOp, scene);
            }

            shadowEncoder.end();

            this.shadowPass.toUpdate = null;
        });
    }
}

export default class ShadowPass {
    constructor(public readonly opts: ShadowPassOptions) {
        if (!opts.updateStrategy) {
            opts.updateStrategy = "whenDirty";
        }
    }

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

    toUpdate: ShadowLight[];

    update(lights?: ShadowLight[]) {
        if (!this.sceneExtension?.initialized) {
            return;
        }

        if (!lights) {
            lights = Array.from(this.sceneExtension.__host.readObjects(ShadowLight));
        }

        this.toUpdate = lights;    
    }
}

interface ShadowPassOptions {
    shadowTextureSize: number;
    updateStrategy?: "everyFrame" | "manual" | "whenDirty"
}