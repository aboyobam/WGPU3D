import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Color from "@/core/Math/Color";
import Quaternion from "@/core/Math/Quaternion";
import Transform from "@/core/Math/Transform";
import ArrayMesh from "@/core/Mesh/ArrayMesh";
import CompositeMesh from "@/core/Mesh/CompositeMesh";
import Renderer from "@/core/Renderer";
import Scene from "@/core/Scene";
import GLTFLoader from "@/loaders/GLTFLoader";
import BasicMaterial from "@/materials/BasicMaterial";

navigator.gpu.requestAdapter().then(async adapter => {
    const device = await adapter.requestDevice();
    const canvas = document.querySelector("canvas");

    const gltf = await GLTFLoader.fromURL("/texcube.gltf", {
        BaseMaterialClass: BasicMaterial,
        fallbackMaterial: new BasicMaterial({ color: new Color(0.8, 0.8, 0.8) })
    });

    const camera = new PerspectiveCamera(45 * Math.PI / 180, canvas.width / canvas.height, 0.1, 100);
    const scene = new Scene({
        maxNumLights: 10
    });
    camera.position.set(0, 3, -5);
    camera.target.set(0, 0, 0);

    const [mesh] = Array.from(gltf.readObjects(CompositeMesh));
    mesh.transform.identity();
    
    const arrayMesh = new ArrayMesh(mesh);
    scene.add(arrayMesh);
    
    for (let i = 0; i < 5; i++) {
        const t = new Transform();
        t.position.x = i * 2 - 4.05;
        t.scale.set(0.4, 0.4, 0.4);
        t.rotation.copy(Quaternion.random());
        arrayMesh.addVariant(t);
    }

    const renderer = new Renderer(canvas, device);
    
    function draw() {
        renderer.render(camera, scene);
        requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);

    setTimeout(() => {
        const img = new Image();
        img.src = canvas.toDataURL();
        document.body.appendChild(img);
    }, 1000);
});