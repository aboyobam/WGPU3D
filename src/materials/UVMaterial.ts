import Material from "./Material";
import fragmentShader from "./UVMaterial.frag.wgsl";

export default class UVMaterial extends Material {
    static readonly fragmentShader = fragmentShader;
}