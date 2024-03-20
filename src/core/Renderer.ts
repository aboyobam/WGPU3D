import Material from "@/materials/Material";
import Camera from "./Camera/Camera";
import Transform from "./Math/Transform";
import Object3D from "./Object3D";
import Scene from "./Scene";
import vertexShader from "./vertex.wgsl";
import DrawOperation from "./DrawOperation";

export default class Renderer {
    static readonly presentationFormat: GPUTextureFormat = navigator.gpu?.getPreferredCanvasFormat?.() ?? "bgra8unorm";
    static readonly depthStencilFormat: GPUTextureFormat = "depth24plus-stencil8";
    
    private readonly context: GPUCanvasContext;
    private readonly depthTexture: GPUTexture;
    private readonly colorAttachment: GPURenderPassColorAttachment;
    private readonly renderPassDescriptor: GPURenderPassDescriptor;
    private readonly vertexShader: GPUVertexState;

    constructor(public readonly canvas: HTMLCanvasElement, public readonly device: GPUDevice) {
        this.context = canvas.getContext("webgpu");

        this.context.configure({
            device: device,
            alphaMode: "premultiplied",
            format: Renderer.presentationFormat
        });

        this.depthTexture = device.createTexture({
            format: Renderer.depthStencilFormat,
            size: [canvas.width, canvas.height],
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        this.colorAttachment = {
            view: null,
            loadOp: "clear",
            storeOp: "store",
            clearValue: { r: 1, g: 1, b: 1, a: 1 }
        };

        this.renderPassDescriptor = {
            label: "default render pass",
            colorAttachments: [this.colorAttachment],
            depthStencilAttachment: {
                view: this.depthTexture.createView(),
                depthLoadOp: "clear",
                depthStoreOp: "store",
                depthClearValue: 1.0,
                stencilLoadOp: "clear",
                stencilStoreOp: "store",
            }
        };

        this.vertexShader = {
            module: device.createShaderModule({ code: vertexShader }),
            entryPoint: "main",
            buffers: [{
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 8,
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3',
                    },
                    {
                        // normal
                        shaderLocation: 1,
                        offset: Float32Array.BYTES_PER_ELEMENT * 3,
                        format: 'float32x3',
                    },
                    {
                        // uv
                        shaderLocation: 2,
                        offset: Float32Array.BYTES_PER_ELEMENT * 6,
                        format: 'float32x2'
                    }
                ],
            }]
        };
    }

    render(camera: Camera, scene: Scene) {
        const commandEncoder = this.device.createCommandEncoder();
        const textureView = this.context.getCurrentTexture().createView();
        this.colorAttachment.view = textureView;

        const renderPass = commandEncoder.beginRenderPass(this.renderPassDescriptor);
        camera.update();
        scene.mount(this.device);
        
        const drawOperation = new DrawOperation({
            device: this.device,
            renderPass,
            scene,
            camera,
            vertexShader: this.vertexShader
        });
        
        renderPass.setBindGroup(0, camera.getBindGroup(this.device));
        this.renderObjects(drawOperation, scene);

        renderPass.end();
        this.device.queue.submit([commandEncoder.finish()]);
    }

    private renderObjects(drawOp: DrawOperation, object: Object3D) {
        for (const child of object.children) {
            this.renderObjects(drawOp, child);
        }

        object.transform.update();
        object.draw(drawOp);
    }
}