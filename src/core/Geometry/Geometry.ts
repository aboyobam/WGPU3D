import Vertex from "@/types/Vertex";

export default class Geometry {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    readonly indexCount: number;

    constructor(private readonly vertices: Vertex[], private indices?: number[]) {
        this.indexCount = vertices.length;
    }

    mount(device: GPUDevice) {
        if (this.vertexBuffer && this.indexBuffer) {
            return;
        }

        const meshBuffer = device.createBuffer({
            size: this.indexCount * (3 + 3 + 2) * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });
        const meshMapping = new Float32Array(meshBuffer.getMappedRange());
        for (let i = 0; i < this.indexCount; i++) {
            const pos = this.vertices[i];
            meshMapping.set(pos.position, 8 * i);
            meshMapping.set(pos.normal, 8 * i + 3);
            meshMapping.set(pos.uv, 8 * i + 6);
        }
        meshBuffer.unmap();
    
        const indexBuffer = device.createBuffer({
            size: this.indexCount * Uint16Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.INDEX,
            mappedAtCreation: true
        });
        if (this.indices) {
            new Uint16Array(indexBuffer.getMappedRange()).set(this.indices);
        } else {
            new Uint16Array(indexBuffer.getMappedRange()).set(Array.from({ length: this.indexCount }, (_, i) => i));
        }
        indexBuffer.unmap();

        this.vertexBuffer = meshBuffer;
        this.indexBuffer = indexBuffer;
    }
}