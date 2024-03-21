import Renderer from "@/core/Renderer";
import GLTFLoader from "@/loaders/GLTFLoader";
import StandartMaterial from "@/materials/StandartMaterial";
import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";
import BasicMaterial from "@/materials/BasicMaterial";
import ShadowPass from "@/extensions/ShadowPass";
import SunLight from "@/lights/SunLight";
import DirectionalLight from "@/lights/DirectonalLight";
import AmbientLight from "@/lights/AmbientLight";
import Mesh from "@/core/Mesh/Mesh";

navigator.gpu.requestAdapter().then(async adapter => {
    await new Promise(r => setTimeout(r, 1000));
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const scene = await GLTFLoader.fromURL("/scene2.gltf", {
        BaseMaterialClass: StandartMaterial,
        fallbackMaterial: new BasicMaterial({ color: new Color(1, 1, 1) }),
        maxNumLights: 5,
    });

    const [camera] = scene.readObjects(PerspectiveCamera);
    const [sunLight] = scene.readObjects(SunLight);
    const [dirLight] = scene.readObjects(DirectionalLight);
    scene.add(new AmbientLight(new Color(1, 1, 1), 0.2));

    const meshes = Array.from(scene.readObjects(Mesh));
    const suzanne = meshes.find(mesh => mesh.name === "Suzanne");
    const cube = meshes.find(mesh => mesh.name === "Cube");
    const torus = meshes.find(mesh => mesh.name === "Torus");
    suzanne.castShadow = true;
    cube.castShadow = true;
    torus.castShadow = true;

    sunLight.intensity = 0.8;
    dirLight.castShadow = true;
    sunLight.castShadow = true;
    sunLight.target.set(1, 1, 1);
    sunLight.position.set(0, 20, 0);
    dirLight.intensity = 4;
    dirLight.decay = 0.02;

    camera.aspect = canvas.width / canvas.height;
    const renderer = new Renderer(canvas, device);
    const shadowPass = new ShadowPass({
        shadowTextureSize: 1024,
    });
    renderer.addExtension(shadowPass.rendererExtension);
    scene.addExtension(shadowPass.sceneExtension);

    function draw() {
        renderer.render(camera, scene);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
});