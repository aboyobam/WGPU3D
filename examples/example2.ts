import Renderer from "@/core/Renderer";
import Scene from "@/core/Scene";
import GLTFLoader from "@/loaders/GLTFLoader";
import UVMaterial from "@/materials/UVMaterial";
import obj from "./cube.obj";
import OBJLoader from "@/loaders/OBJLoader";
import BasicMaterial from "@/materials/BasicMaterial";
import StandartMaterial from "@/materials/StandartMaterial";
import Light from "@/lights/Light";
import PointLight from "@/lights/PointLight";
import { mat4 } from "wgpu-matrix";
import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";

navigator.gpu.requestAdapter().then(async adapter => {
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const gltf = await GLTFLoader.fromURL("/texcube.gltf", {
        BaseMaterialClass: StandartMaterial,
        fallbackMaterial: new StandartMaterial({ color: new Color(0.8, 0.8, 0.8) })
    });

    const [camera] = gltf.readObjects(PerspectiveCamera);
    const lights = Array.from(gltf.readObjects(PointLight));
    lights.forEach(light => {
        light.intensity = 5;
        light.decay = 0.2;
    });
    
    camera.aspect = canvas.width / canvas.height;
    const renderer = new Renderer(canvas, device);
    
    function draw() {
        renderer.render(camera, gltf);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
});