export default interface UniformBindGroup {
    getBindGroup(device: GPUDevice): GPUBindGroup;
    update(): void;
}