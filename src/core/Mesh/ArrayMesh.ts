import Transform from "../Math/Transform";
import BundleMesh from "./BundleMesh";
import Mesh from "./Mesh";

export default class ArrayMesh extends BundleMesh {
    private readonly variants = new Map<Transform, Mesh>();

    constructor(public readonly mesh: Mesh) {
        super();
    }

    addVariant(t: Transform) {
        const clone = this.mesh.clone();
        clone.transform.copy(t);
        super.add(clone);
        this.variants.set(t, clone);
    }

    removeVariant(t: Transform) {
        super.remove(this.variants.get(t));
        this.variants.delete(t);
    }
}