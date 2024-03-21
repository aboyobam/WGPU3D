import Geometry from "@/core/Geometry/Geometry";
import Color from "@/core/Math/Color";
import Mesh from "@/core/Mesh/Mesh";
import StandartMaterial from "@/materials/StandartMaterial";
import Vertex from "@/types/Vertex";

export default class OBJLoader {
    static fromURL(url: string): Promise<Mesh[]> {
        return fetch(url).then(response => response.text()).then(text => OBJLoader.parse(text));
    }

    static fromContentsString(contents: string): Mesh[] {
        return OBJLoader.parse(contents);
    }

    private static parse(obj: string): Mesh[] {
        const results = parseObj(obj);
        const meshes: Mesh[] = [];

        for (const result of results) {
            const geometry = new Geometry(result.positions);
            const mesh = new Mesh(geometry);
            meshes.push(mesh);
        }

        return meshes;
    }
}

function parseObj(obj: string): ParseResult[] {
    const lines = obj.split('\n');

    const objects: ObjObject[] = [];
    const results: ParseResult[] = [];

    for (let index = 0; index < lines.length; index++) {
        const [command, ...args] = lines[index].split(' ');
        const current = objects.at(-1);

        if (command === 'o') {
            objects.push({
                name: args[0],
                vertices: [],
                normals: [],
                uvs: []
            });
        } else if (command === 'v') {
            current.vertices.push([+args[0], +args[1], +args[2]]);
        } else if (command === 'vn') {
            current.normals.push([+args[0], +args[1], +args[2]]);
        } else if (command === 'vt') {
            current.uvs.push([+args[0], +args[1]]);
        } else if (command === 's') {
            const res: ParseResult = {
                indices: [],
                positions: [],
                name: current.name
            };
            
            for (let j = index + 1;; j++) {
                const [command, ...args] = lines[j]?.split(' ') ?? [];
                if (command !== 'f') {
                    index = j - 1;
                    break;
                }

                const vertices = args.map(arg => arg.split('/').map(Number));
                
                for (const [i, u, n] of vertices) {
                    res.positions.push({
                        position: current.vertices[i - 1],
                        normal: current.normals[n - 1],
                        uv: current.uvs[u - 1]
                    });
                    res.indices.push(res.indices.length);
                }
            }

            results.push(res);
        }
    }

    return results;
}

interface ParseResult {
    positions: Vertex[];
    indices: number[];
    name: string;
}

interface ObjObject {
    vertices: [number, number, number][];
    normals: [number, number, number][];
    uvs: [number, number][];
    name: string;
}