import Renderer from "@/core/Renderer";
import GLTFLoader from "@/loaders/GLTFLoader";
import StandartMaterial from "@/materials/StandartMaterial";
import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";
import DirectionalLight from "@/lights/DirectonalLight";
import AmbientLight from "@/lights/AmbientLight";
import SunLight from "@/lights/SunLight";
import Vector3 from "@/core/Math/Vector3";
import PointLight from "@/lights/PointLight";
import BasicMaterial from "@/materials/BasicMaterial";
import ShadowPass from "@/extensions/ShadowPass";
import Light from "@/lights/Light";

navigator.gpu.requestAdapter().then(async adapter => {
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const gltf = await GLTFLoader.fromURL("/ex3.gltf", {
        BaseMaterialClass: StandartMaterial,
        fallbackMaterial: new BasicMaterial({ color: new Color(1, 1, 1) }),
        maxNumLights: 1,
    });

    const [camera] = gltf.readObjects(PerspectiveCamera);

    for (const light of gltf.readObjects(Light)) {
        if (light instanceof SunLight) {
            light.intensity = 1.5;
            light.position.y = 5;
        } else {
            light.remove();
        }
    }

    camera.aspect = canvas.width / canvas.height;
    const renderer = new Renderer(canvas, device);
    const shadowPass = new ShadowPass(256);
    // gltf.addExtension(shadowPass.sceneExtension);
    // renderer.addExtension(shadowPass.rendererExtension);

    function draw() {
        renderer.render(camera, gltf);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);

    /*
    let done = false;
    function downloadX() {
        done = true;
        const ctx = canvas.getContext('webgpu');
        requestAnimationFrame(() => {
            const commandEncoder = device.createCommandEncoder();
            const renderPassDescriptor: GPURenderPassDescriptor = {
                colorAttachments: [{
                    view: ctx.getCurrentTexture().createView(),
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            };

            const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
            const bgl = device.createBindGroupLayout({
                entries: [
                    {
                        binding: 0,
                        visibility: GPUShaderStage.FRAGMENT,
                        sampler: { type: 'comparison' }
                    },
                    {
                        binding: 1,
                        visibility: GPUShaderStage.FRAGMENT,
                        texture: { sampleType: 'depth' }
                    }
                ]
            });

            passEncoder.setPipeline(device.createRenderPipeline({
                layout: device.createPipelineLayout({
                    bindGroupLayouts: [bgl]
                }),
                vertex: {
                    module: device.createShaderModule({ code: shaderCode }),
                    entryPoint: 'vs_main'
                },
                fragment: {
                    module: device.createShaderModule({ code: shaderCode }),
                    entryPoint: 'fs_main',
                    targets: [{
                        format: 'bgra8unorm',
                    }]
                },

            }));
            // Set the texture view and sampler
            passEncoder.setBindGroup(0, device.createBindGroup({
                layout: bgl,
                entries: [
                    {
                        binding: 0,
                        resource: device.createSampler({ compare: 'less' })
                    },
                    {
                        binding: 1,
                        resource: shadowPass.shadowRendererExtension['shadowDepthTextureView']
                    }
                ]
            }));
            passEncoder.draw(6);
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        });  
    }

    (window as any).dlx = downloadX;*/
});

const shaderCode = `
@group(0) @binding(0) var mySampler : sampler_comparison;
@group(0) @binding(1) var myTexture : texture_depth_2d;

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4<f32> {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(-1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(1.0, 1.0));

    return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4f) -> @location(0) vec4<f32> {
    let v = textureSampleCompare(myTexture, mySampler, vec2f(pos.x, pos.y), 0.01);
    return vec4<f32>(v, 0.0, 0.0, 1.0);
}
`;