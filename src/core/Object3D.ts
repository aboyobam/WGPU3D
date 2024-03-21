import Light from "../lights/Light";
import Camera from "./Camera/Camera";
import Transform from "./Math/Transform";
import Mesh from "./Mesh/Mesh";
import Scene from "./Scene";
import DrawOperation from "./DrawOperation";
import Extension from "@/extensions/Extension";

export default class Object3D extends Extension.Host {
    protected readonly _isObject3D: boolean = true;
    isObject3D(): this is Object3D { return this._isObject3D; }

    protected readonly _isMesh: boolean = false;
    isMesh(): this is Mesh { return this._isMesh; }

    protected readonly _isCamera: boolean = false;
    isCamera(): this is Camera { return this._isCamera; }

    protected readonly _isLight: boolean = false;
    isLight(): this is Light { return this._isLight; }

    protected readonly _isScene: boolean = false;
    isScene(): this is Scene { return this._isScene; }

    protected readonly renderable: boolean = false;

    readonly transform: Transform;
    parent: Object3D;
    children: Object3D[] = [];
    castShadow = false;
    name: string;
    
    constructor() {
        super();
        this.transform = new Transform();
    }

    add(...children: Object3D[]): void {
        for (const child of children) {
            if (child.parent) {
                const index = child.parent.children.indexOf(child);
                if (index !== -1) {
                    child.parent.children.splice(index, 1);
                }
            }
            
            child.parent = this;
            child.transform.parent = this.transform;
            this.children.push(child);
        }
    }

    remove(): void {
        if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index !== -1) {
                this.parent.children.splice(index, 1);
            }
            this.parent = null;
            this.transform.parent = null;
        }
    }

    get position() {
        return this.transform.position;
    }

    get scale() {
        return this.transform.scale;
    }

    get rotation() {
        return this.transform.rotation;
    }

    *traverse(): Iterable<Object3D> {
        yield this;
        for (const child of this.children) {
            yield* child.traverse();
        }
    }

    *readObjects<T extends Object3D>(Class: Object3DConstructor<T>): Iterable<T> {
        for (const object of this.traverse()) {
            if (object instanceof Class) {
                yield object;
            }
        }
    }

    draw(drawOp: DrawOperation): void {};
}

interface Object3DConstructor<T extends Object3D> {
    new(...args: any[]): T;
}