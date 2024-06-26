import Material from "./Material";
import fragmentShader from "./BasicMaterial.frag.wgsl";
import Renderer from "@/core/Renderer";
import Color from "@/core/Math/Color";
import DrawOperation from "@/core/DrawOperation";

export default class BasicMaterial extends Material {
    private texture: GPUTexture;
    private sampler: GPUSampler;
    private initialized = false;
    private ready = false;
    private bitmap: ImageBitmap;
    private bindGroup: GPUBindGroup;

    private static imageBindGroupLayout: GPUBindGroupLayout;
    protected static getImageBindingGroupLayout(device: GPUDevice): GPUBindGroupLayout {
        if (this.imageBindGroupLayout) {
            return this.imageBindGroupLayout;
        }

        this.imageBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {},
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {
                        sampleType: 'float'
                    }
                }
            ]
        });

        return this.imageBindGroupLayout;
    }

    protected static getFragmentShader(drawOp: DrawOperation): GPUFragmentState {
        return {
            module: drawOp.device.createShaderModule({ code: fragmentShader }),
            targets: [{
                format: Renderer.presentationFormat,
                blend: {
                    alpha: {
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    },
                    color: {
                        srcFactor: "src-alpha",
                        dstFactor: "one-minus-src-alpha",
                        operation: "add"
                    }
                }
            }],
            entryPoint: "main"
        };
    }

    static mount(drawOp: DrawOperation, layouts: GPUBindGroupLayout[], callback?: () => void) {        
        Material.mount.call(this, drawOp, [
            ...layouts,
            BasicMaterial.getImageBindingGroupLayout(drawOp.device)
        ], callback);
    }

    constructor(private readonly opts: BasicMaterialOptions = {}) {
        super();

        if (opts.color) {
            if (opts.texture) {
                throw new Error("Cannot specify both color and texture");
            }

            if (opts.bitmap) {
                throw new Error("Cannot specify both color and bitmap");
            }

            const imageData = new ImageData(1, 1);
            imageData.data.set([opts.color.r * 255, opts.color.g * 255, opts.color.b * 255, 255]);

            createImageBitmap(imageData).then(bitmap => {
                this.bitmap = bitmap;
            });            
            createImageBitmap(imageData).then(bitmap => {
                this.bitmap = bitmap;
            });
        }

        if (opts.bitmap) {
            this.bitmap = opts.bitmap;
        }

        if (opts.texture) {
            this.texture = opts.texture;
        }

        if (opts.sampler) {
            this.sampler = opts.sampler;
        }

        if (!this.bitmap && !this.texture && !opts.color) {
            throw new Error("Must specify color, texture, or bitmap");
        }
    }

    private init(device: GPUDevice) {
        if (this.bitmap) {
            this.initialized = true;

            this.texture = device.createTexture({
                size: {
                    width: this.bitmap.width,
                    height: this.bitmap.height,
                    depthOrArrayLayers: 1
                },
                format: Renderer.presentationFormat,
                usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
            });

            device.queue.copyExternalImageToTexture({ source: this.bitmap }, { texture: this.texture }, [this.bitmap.width, this.bitmap.height]);
        }

        if (!this.sampler) {
            this.sampler = device.createSampler({
                magFilter: "linear",
                minFilter: "linear",
            });
        }
        
        if (this.texture) {
            this.bindGroup = device.createBindGroup({
                layout: BasicMaterial.getImageBindingGroupLayout(device),
                entries: [
                    {
                        binding: 0,
                        resource: this.sampler
                    },
                    {
                        binding: 1,
                        resource: this.texture.createView()
                    }
                ]
            });

            this.initialized = true;
            this.ready = true;
        }
    }

    use(drawOp: DrawOperation): boolean {
        if (!this.ready) {
            if (!this.initialized) {
                this.init(drawOp.device);
            }

            return false;
        }

        const pipelineReady = super.use(drawOp);
        if (!pipelineReady) {
            return false;
        }

        drawOp.renderPass.setBindGroup(2, this.bindGroup);

        return true;
    }
}

interface BasicMaterialOptions {
    color?: Color;
    texture?: GPUTexture;
    sampler?: GPUSampler;
    bitmap?: ImageBitmap;
}