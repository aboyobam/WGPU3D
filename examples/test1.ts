import Renderer from "@/core/Renderer";
import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";
import BasicMaterial from "@/materials/BasicMaterial";
import GLTFLoader from "@/loaders/GLTFLoader";
import StandartMaterial from "@/materials/StandartMaterial";
import Light from "@/lights/Light";
import DirectionalLight from "@/lights/DirectonalLight";
import SunLight from "@/lights/SunLight";
import AmbientLight from "@/lights/AmbientLight";
import ShadowPass from "@/extensions/ShadowPass";
import Mesh from "@/core/Mesh/Mesh";
import PointLight from "@/lights/PointLight";

navigator.gpu.requestAdapter().then(async adapter => {
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const scene = await GLTFLoader.fromURL("/tree.gltf", {
        BaseMaterialClass: StandartMaterial,
        fallbackMaterial: new BasicMaterial({ color: new Color(1, 1, 1) }),
        maxNumLights: 5,
    });

    const [camera] = scene.readObjects(PerspectiveCamera);
    //camera.aspect = canvas.width / canvas.height;
    const renderer = new Renderer(canvas, device);

    const [lamp] = scene.readObjects(DirectionalLight);
    const [top, window] = scene.readObjects(SunLight);

    lamp.intensity = 3.5;
    lamp.decay = 0.01;
    top.intensity = 0.8;
    lamp.castShadow = true;
    lamp.position.y -= 0.15;
    lamp.position.z += 0.15;
    
    const point = new PointLight(100, 0.5, lamp.color);
    point.position.copy(lamp.position);
    scene.add(point);

    scene.add(new AmbientLight(new Color(1, 1, 1), 0.8));

    const shadowPass = new ShadowPass({
        shadowTextureSize: 2048,
        updateStrategy: "everyFrame",
    });

    scene.addExtension(shadowPass.sceneExtension);
    renderer.addExtension(shadowPass.rendererExtension);

    Array.from(scene.readObjects(Mesh)).forEach(mesh => {
        mesh.castShadow = true;
    });

    function draw() {
        renderer.render(camera, scene);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
});