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
import DebugMesh from "@/core/DebugMesh";
import Mesh from "@/core/Mesh/Mesh";
import Quaternion from "@/core/Math/Quaternion";
import Extension from "@/extensions/Extension";
import Camera from "@/core/Camera/Camera";

navigator.gpu.requestAdapter().then(async adapter => {
    await new Promise(r => setTimeout(r, 1000));
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const gltf = await GLTFLoader.fromURL("/ex3.gltf", {
        BaseMaterialClass: StandartMaterial,
        fallbackMaterial: new BasicMaterial({ color: new Color(1, 1, 1) }),
        maxNumLights: 1,
    });

    const [camera] = gltf.readObjects(PerspectiveCamera);
    const [, cube] = gltf.readObjects(Mesh);
    camera.target.set(0, 0, 0);

    for (const light of gltf.readObjects(Light)) {
        if (light instanceof SunLight) {
            light.intensity = 1.5;
            light.position.y = 5;

            light.position.copy(camera.position);
            light.target.copy(camera.target);

            light.target.x += 10;
        } else {
            light.remove();
        }
    }

    class CamExtension extends Extension<Camera> {
        init(): void {}
    }

    Extension.provide(Camera, CamExtension);

    camera.aspect = canvas.width / canvas.height;
    const renderer = new Renderer(canvas, device);
    const shadowPass = new ShadowPass(1024);
    renderer.addExtension(shadowPass.rendererExtension);
    gltf.addExtension(shadowPass.sceneExtension);

    const dbm = new DebugMesh();
    //gltf.add(dbm);

    function draw() {
        cube.rotation.rotateY(0.01);
        renderer.render(camera, gltf);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
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