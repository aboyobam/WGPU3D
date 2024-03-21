import Renderer from "@/core/Renderer";
import Material from "./Material";
import DrawOperation from "@/core/DrawOperation";

export default class ShadowDepthMaterial extends Material {
    protected static readonly fragmentShader = `
    @group(2) @binding(0) var mySampler: sampler;
    @group(2) @binding(1) var shadowMap: texture_depth_2d;
    
    @fragment
    fn main(@builtin(position) fragCoord: vec4<f32>) 
        -> @location(0) vec4<f32> {
        let depth = textureSample(shadowMap, mySampler, fragCoord.xy);
        return vec4<f32>(depth, 0.0, 0.0, 1.0);
    }
    `;

    static bgl: GPUBindGroupLayout;
    bindGroup: GPUBindGroup;

    static mount(drawOp: DrawOperation, layouts: GPUBindGroupLayout[], callback?: () => void) {
        if (Material.mounting.has(this)) {
            if (callback && !Material.mounted.has(this)) {
                Material.mounting.get(this).then(() => {
                    callback();
                });
            }
            return;
        }

        if (!this.bgl) {
            this.bgl = drawOp.device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: {}
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: {
                            sampleType: "depth"
                        }
                    }
                ]
            });
        }
        
        const create = drawOp.device.createRenderPipelineAsync({
            layout: drawOp.device.createPipelineLayout({
                bindGroupLayouts: [
                    ...layouts,
                    this.bgl
                ]
            }),
            vertex: {
                module: drawOp.device.createShaderModule({
                    code: `
                    @vertex
                    fn main(@builtin(vertex_index) vertexIndex: u32) 
                        -> @builtin(position) vec4<f32> {
                        var positions = array<vec2<f32>, 6>(
                            vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
                            vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));
                        return vec4<f32>(positions[vertexIndex], 0.0, 1.0);
                    }
                    `
                }),
                entryPoint: "main",
                buffers: Renderer.vertexBuffers
            },
            depthStencil: {
                format: Renderer.depthStencilFormat,
                depthWriteEnabled: true,
                depthCompare: "less"
            },
            fragment: {
                module: drawOp.device.createShaderModule({ code: this.fragmentShader }),
                targets: [{ format: Renderer.presentationFormat }],
                entryPoint: "main"
            },
            primitive: Renderer.primitiveState
        }).then(pipeline => {
            Material.mounted.set(this, pipeline);
            callback?.();
        });

        Material.mounting.set(this, create);
    }

    use(drawOp: DrawOperation): boolean {
        const pipeline = Material.mounted.get(this.MaterialClass);
        if (!pipeline) {
            return false;
        }

        if (!this.bindGroup) {
            console.log(drawOp.scene.shadowTextureView);
            
            this.bindGroup = drawOp.device.createBindGroup({
                layout: ShadowDepthMaterial.bgl,
                entries: [
                    {
                        binding: 0,
                        resource: drawOp.device.createSampler({
                            minFilter: "linear",
                            magFilter: "linear",
                        })
                    },
                    {
                        binding: 1,
                        resource: drawOp.scene.shadowTextureView
                    }
                ]
            });
        }

        drawOp.renderPass.setPipeline(pipeline);
        drawOp.renderPass.setBindGroup(2, this.bindGroup);
        return true;
    }
}