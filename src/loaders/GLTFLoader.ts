import PerspectiveCamera from "@/core/Camera/PerspectiveCamera";
import Geometry from "@/core/Geometry/Geometry";
import Color from "@/core/Math/Color";
import Quaternion from "@/core/Math/Quaternion";
import Vector3 from "@/core/Math/Vector3";
import CompositeMesh from "@/core/Mesh/CompositeMesh";
import Mesh from "@/core/Mesh/Mesh";
import Object3D from "@/core/Object3D";
import Scene from "@/core/Scene";
import DirectionalLight from "@/lights/DirectonalLight";
import PointLight from "@/lights/PointLight";
import SunLight from "@/lights/SunLight";
import BasicMaterial from "@/materials/BasicMaterial";
import Material from "@/materials/Material";
import StandartMaterial from "@/materials/StandartMaterial";
import Vertex from "@/types/Vertex";
import { quat, vec3 } from "wgpu-matrix";

interface GLTFLoaderOptions {
    BaseMaterialClass: typeof BasicMaterial | typeof StandartMaterial;
    fallbackMaterial: Material;
    maxNumLights: number;
}

export default class GLTFLoader {
    static async fromURL(url: string, opts: GLTFLoaderOptions) {
        const gltf: GLTF = await fetch(url).then(response => response.json());

        const parser = new GLTFLoader(gltf, opts);
        const data = await parser.parse();
        return data;
    }

    private constructor(private readonly gltf: GLTF, private opts: GLTFLoaderOptions) {}

    private buffers: ArrayBuffer[];
    private materials: Material[] = [];

    async parse() {
        this.buffers = await Promise.all(
            this.gltf.buffers.map(buffer => 
                fetch(buffer.uri).then(response => response.arrayBuffer())
            )
        );

        const scene = new Scene({
            maxNumLights: this.opts.maxNumLights
        });

        const gltfScene = this.gltf.scenes[this.gltf.scene];
        for (const nodeIndex of gltfScene.nodes) {
            const gltfNode = this.gltf.nodes[nodeIndex];
            
            const node = await this.parseNode(gltfNode);
            scene.add(node);
        }

        return scene;
    }

    private async parseNode(node: GLTF["nodes"][number]): Promise<Object3D> {
        const rotation = node.rotation || [0, 0, 0, 1];
        const translation = node.translation || [0, 0, 0];
        const scale = node.scale || [1, 1, 1];

        let object: Object3D;

        if ("camera" in node) {
            const camera = this.gltf.cameras[node.camera];
            if (camera.type === "perspective") {
                const cam = new PerspectiveCamera(
                    camera.perspective.yfov,
                    camera.perspective.aspectRatio,
                    camera.perspective.znear,
                    camera.perspective.zfar
                );
                const lookDirection = vec3.transformQuat([0, 0, 1], rotation);
                vec3.sub(translation, lookDirection, lookDirection);
                cam.target.set(lookDirection[0], lookDirection[1], lookDirection[2]);
                object = cam;
            }
        } else if ("mesh" in node) {
            const gltfMesh = this.gltf.meshes[node.mesh];
            object = await this.parseMesh(gltfMesh);
        } else if ("KHR_lights_punctual" in node.extensions) {
            const light = this.gltf.extensions["KHR_lights_punctual"].lights[node.extensions["KHR_lights_punctual"].light];
            if (light.type == "point") {
                object = new PointLight(light.intensity, 0, new Color(light.color[0], light.color[1], light.color[2]));
            } else if (light.type == "spot") {
                const color = new Color(light.color[0], light.color[1], light.color[2]);
                const intensity = light.intensity;
                const innerConeAngle = light.spot.innerConeAngle;
                const outerConeAngle = light.spot.outerConeAngle;
                const dirLight = new DirectionalLight(intensity, 0, color);
                dirLight.innerCone = innerConeAngle;
                dirLight.outerCone = outerConeAngle;
                const lookDirection = vec3.transformQuat([0, 0, 1], rotation);
                vec3.sub(translation, lookDirection, lookDirection);
                dirLight.target.set(lookDirection[0], lookDirection[1], lookDirection[2]);
                object = dirLight;
            } else if (light.type == "directional") {
                const color = new Color(light.color[0], light.color[1], light.color[2]);
                const intensity = light.intensity;
                const sunLight = new SunLight(intensity, color, new Vector3(0, 0, 0));
                const [tx, ty, tz] = vec3.transformQuat([0, 0, -1], rotation);
                sunLight.target.set(tx, ty, tz);
                object = sunLight;
            } else {
                console.log("Unsupported light type", light.type);
                object = new Object3D();
            }
        }

        object.position.set(translation[0], translation[1], translation[2]);
        object.rotation.set(rotation[0], rotation[1], rotation[2], rotation[3]);
        object.scale.set(scale[0], scale[1], scale[2]);
        object.name = node.name;

        if (node.children) {
            for (const childIndex of node.children) {
                const child = this.gltf.nodes[childIndex];
                const childObject = await this.parseNode(child);
                object.add(childObject);
            }
        }

        return object;
    }

    private async parseMesh(mesh: GLTF["meshes"][number]) {
        if (mesh.primitives.length > 1) {
            const allVertices: Vertex[][] = [];
            const allMaterials: Material[] = [];

            for (const primitive of mesh.primitives) {
                const prim = this.parsePrimitive(primitive);
                const material = await this.parseMaterial(primitive.material);
                const vertices = this.primitiveToVertices(prim);
                allVertices.push(vertices);
                allMaterials.push(material);
            }

            return new CompositeMesh(allVertices, allMaterials);
        } else {
            const primitive = mesh.primitives[0];
            const prim = this.parsePrimitive(primitive);
            const material = await this.parseMaterial(primitive.material);
            const vertices = this.primitiveToVertices(prim);
            const geometry = new Geometry(vertices);
            return new Mesh(geometry, material);
        }
    }

    private primitiveToVertices(prim: ReturnType<GLTFLoader["parsePrimitive"]>): Vertex[] {
        const { indices, normals, positions: vertices, uvs } = prim;
        const result: Vertex[] = [];

        for (let i = 0; i < indices.length; i++) {
            const index = indices[i];
            result.push({
                position: vertices[index],
                normal: normals[index],
                uv: uvs[index]
            });
        }

        return result;
    }

    private parsePrimitive(primitive: GLTF["meshes"][number]["primitives"][number]) {
        const positionAccessor = this.gltf.accessors[primitive.attributes.POSITION];
        const normalAccessor = this.gltf.accessors[primitive.attributes.NORMAL];
        const uvAccessor = this.gltf.accessors[primitive.attributes.TEXCOORD_0];
        const indexAccessor = this.gltf.accessors[primitive.indices];

        const positionBufferView = this.gltf.bufferViews[positionAccessor.bufferView];
        const normalBufferView = this.gltf.bufferViews[normalAccessor.bufferView];
        const uvBufferView = uvAccessor && this.gltf.bufferViews[uvAccessor.bufferView];
        const indexBufferView = this.gltf.bufferViews[indexAccessor.bufferView];

        const positionBuffer = this.buffers[positionBufferView.buffer];
        const normalBuffer = this.buffers[normalBufferView.buffer];
        const uvBuffer = uvAccessor && this.buffers[uvBufferView.buffer];
        const indexBuffer = this.buffers[indexBufferView.buffer];

        const positionData = new DataView(positionBuffer, positionBufferView.byteOffset, positionBufferView.byteLength);
        const normalData = new DataView(normalBuffer, normalBufferView.byteOffset, normalBufferView.byteLength);
        const uvData = uvAccessor && new DataView(uvBuffer, uvBufferView.byteOffset, uvBufferView.byteLength);
        const indexData = new DataView(indexBuffer, indexBufferView.byteOffset, indexBufferView.byteLength);

        const positions: [number, number, number][] = [];
        const normals: [number, number, number][] = [];
        const uvs: [number, number][] = [];
        const indices: number[] = [];

        for (let i = 0; i < positionAccessor.count; i++) {
            const x = positionData.getFloat32((i * 3 + 0) * Float32Array.BYTES_PER_ELEMENT, true);
            const y = positionData.getFloat32((i * 3 + 1) * Float32Array.BYTES_PER_ELEMENT, true);
            const z = positionData.getFloat32((i * 3 + 2) * Float32Array.BYTES_PER_ELEMENT, true);
            positions.push([x, y, z]);
        }

        for (let i = 0; i < normalAccessor.count; i++) {
            const x = normalData.getFloat32((i * 3 + 0) * Float32Array.BYTES_PER_ELEMENT, true);
            const y = normalData.getFloat32((i * 3 + 1) * Float32Array.BYTES_PER_ELEMENT, true);
            const z = normalData.getFloat32((i * 3 + 2) * Float32Array.BYTES_PER_ELEMENT, true);
            normals.push([x, y, z]);
        }

        if (uvAccessor) {
            for (let i = 0; i < uvAccessor.count; i++) {
                const u = uvData.getFloat32((i * 2 + 0) * Float32Array.BYTES_PER_ELEMENT, true);
                const v = uvData.getFloat32((i * 2 + 1) * Float32Array.BYTES_PER_ELEMENT, true);
                uvs.push([u, v]);
            }
        } else {
            for (let i = 0; i < positionAccessor.count; i++) {
                uvs.push([0, 0]);
            }
        }

        const byteStride = indexAccessor.byteStride || 2;
        for (let i = 0; i < indexAccessor.count; i++) {
            const byteOffset = i * byteStride;
            const index = this.getIndexFromView(indexData, byteOffset, indexAccessor.componentType);
            indices.push(index);
        }

        return {
            positions,
            normals,
            uvs,
            indices
        };
    }

    private async parseMaterial(materialIndex: number): Promise<Material> {
        if (typeof materialIndex !== "number") {
            return this.opts.fallbackMaterial;
        }

        if (this.materials[materialIndex]) {
            return this.materials[materialIndex];
        }

        const gltfMaterial = this.gltf.materials[materialIndex];
        const pbr = gltfMaterial.pbrMetallicRoughness;
        let mat: Material;
        if (pbr.baseColorFactor) {
            const color = new Color(pbr.baseColorFactor[0], pbr.baseColorFactor[1], pbr.baseColorFactor[2]);
            mat = new this.opts.BaseMaterialClass({ color });
        } else if (pbr.baseColorTexture) {
            const bitmap = await this.parseTexture(pbr.baseColorTexture.index);
            mat = new this.opts.BaseMaterialClass({ bitmap });
        }

        this.materials[materialIndex] = mat;
        return mat;
    }

    private parseTexture(textureIndex: number): Promise<ImageBitmap> {
        const gltfTexture = this.gltf.textures[textureIndex];
        const gltfImage = this.gltf.images[gltfTexture.source];
        const bufferView = this.gltf.bufferViews[gltfImage.bufferView];
        const buffer = this.buffers[bufferView.buffer];
        const data = new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength);
        const blob = new Blob([data], { type: gltfImage.mimeType });
        return createImageBitmap(blob, {});
    }

    private getIndexFromView(view: DataView, byteOffset: number, componentType: number): number {
        switch (componentType) {
            case 5120:  // BYTE
                return view.getInt8(byteOffset);
            case 5121:  // UNSIGNED_BYTE
                return view.getUint8(byteOffset);
            case 5122:  // SHORT
                return view.getInt16(byteOffset, true);
            case 5123:  // UNSIGNED_SHORT
                return view.getUint16(byteOffset, true);
            case 5125:  // UNSIGNED_INT
                return view.getUint32(byteOffset, true);
            default:
                throw new Error(`Unsupported componentType: ${componentType}`);
        }
    }
}

interface GLTF {
    asset: {
        generator: string;
        version: string;
    }
    extensionsUsed: string[];
    extensionsRequired: string[];
    extensions: {
        [key: string]: any;
    }

    scene: number;
    scenes: {
        name: string;
        nodes: number[];
        extras: Record<string, any>;
    }[];

    nodes: {
        name: string;
        children: number[];
        translation: number[];
        rotation: number[];
        scale: number[];
        extensions: {
            [key: string]: any;
        }
        camera?: number;
        mesh?: number;
        extras: Record<string, any>;
    }[];

    cameras: {
        name: string;
        type: string;
        perspective: {
            aspectRatio: number;
            yfov: number;
            znear: number;
            zfar: number;
        }
        extras: Record<string, any>;
    }[];

    textures: {
        sampler: number;
        source: number;
        name: string;
        extensions: {
            [key: string]: any;
        }
        extras: Record<string, any>;
    }[];

    images: {
        bufferView: number;
        mimeType: string;
        name: string;
    }[];

    samplers: {
        magFilter: number;
        minFilter: number;
    }[];

    materials: {
        doubleSided: boolean;
        name: string;
        extras: Record<string, any>;
        pbrMetallicRoughness: {
            baseColorFactor: number[];
            metallicFactor: number;
            roughnessFactor: number;
            baseColorTexture: {
                index: number;
                texCoord: number;
            }
            metallicRoughnessTexture: {
                index: number;
                texCoord: number;
            }
        }
    }[];

    meshes: {
        name: string;
        primitives: {
            attributes: {
                POSITION: number;
                NORMAL: number;
                TEXCOORD_0: number;
            }
            indices: number;
            material: number;
        }[];
    }[];

    accessors: {
        bufferView: number;
        byteOffset: number;
        componentType: number;
        byteStride: number;
        count: number;
        max: number[];
        min: number[];
        type: string;
    }[];

    bufferViews: {
        buffer: number;
        byteLength: number;
        byteOffset: number;
        target: number;
    }[];

    buffers: {
        byteLength: number;
        uri: string;
    }[];
}