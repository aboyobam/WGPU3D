import Renderer from "@/core/Renderer";
import Scene from "@/core/Scene";
import cubeOBJ from "./cube.obj";
import OBJLoader from "@/loaders/OBJLoader";
import SunLight from "@/lights/SunLight";
import PointLight from "@/lights/PointLight";
import AmbientLight from "@/lights/AmbientLight";
import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";
import Vector3 from "@/core/Math/Vector3";
import ShadowPass from "@/extensions/ShadowPass";

navigator.gpu.requestAdapter().then(async adapter => {
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const renderer = new Renderer(canvas, device);
    const camera = new PerspectiveCamera(45 / 180 * Math.PI, canvas.width / canvas.height, 0.1, 100);
    camera.position.set(0, 2, 5);

    const scene = new Scene({
        maxNumLights: 5
    });

    const [cube] = OBJLoader.fromContentsString(cubeOBJ);

    const sun = new SunLight(
        0.2, // intensity
        new Color(1, 1, 0), // color
        new Vector3(0.3, -0.6, -0.4) // top down
    );

    const ambient = new AmbientLight(new Color(1, 1, 1), 0.1);

    const lightBlob = new PointLight(9, 0.3, new Color(1, 1, 1));
    lightBlob.position.copy(camera.position);

    cube.scale.set(0.5, 0.5, 0.5);
    camera.target.copy(cube.position);
    scene.add(sun, lightBlob, ambient, cube);
    
    function draw() {
        renderer.render(camera, scene);
        cube.rotation.rotateY(0.01);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
});