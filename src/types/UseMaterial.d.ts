import Material from "@/materials/Material";

export default interface UseMaterial {
    (material: Material, renderPass?: GPURenderPassEncoder | GPURenderBundleEncoder): boolean;
}