# Documentation
## Core
### Object3D
This class is used for any object (scene, camera, light, mesh...). It has a transform and tracks its children.

#### Constructor
`Object3D()`

#### Properties
- `transform`: Transform -> keeps track of the position, rotation and scale
- `parent`: Object3D -> parent object (may be null)
- `children`: Object3D[] -> all of it's direct children

#### Methods
- `add(...others: Object3D[])`: adds children to this objects. The children inherit the object's transform
- `remove()`: removes this object from its parent
- `*readObjects(class: typeof Object3D)`: recursivly reads all objects with a given class.
- `clone()`: clones this object with its transform (not recursive)
#### Example:
```ts
const parent = new Object3D();
const child = new Object3D();
const mesh = new Mesh(...);

parent.add(child);
child.add(mesh);

child.position.x = 10;
parent.rotation.rotateY(45); // rotate around the parents origin

const allMeshes = parent.readObjects(Mesh);
```


### Scene
#### extends `Object3D`
This is the base class for any render. It contains all objects, lights and cameras

#### Constructor
`Scene(options)` \
options:
- `maxNumLights`: the maximum number of lights, used for computing the shadow atlas size

#### Example:
```ts
const scene = new Scene({
    maxNumLights: 4
});
```

### Geometry
This class holds a list of vertecies, normals, uvs and indices for any trimesh geometry. \
*It's not recommended to use this class; unless you want to build your own abstractions* use `BoxGeometry` (or others) instead.

#### Constructor
`Geometry(vertices: Vertex[], indices: number[])` \
Vertex:
- `position`: [number, number, number] -> xyz in world space
- `normal`: [number, number, number] -> xyz normalized
- `uv`: [number, number] -> uv (0 to 1)

indices: a array of integers for the index buffer. where `indices[N] < vertices.length`

### Material
Abstract class for all Materials.

### UVMaterial
#### extends `Material`
This material yields the current uv coordinates as color.

#### Constructor
`UVMaterial()`

### BasicMaterial
#### extends `Material`
This material has a color or image texture. it does not react with light and doesn't receive shadows.

#### Constructor
`BasicMaterial(opts)` \
opts:
- `color?`: Color -> a static color.
- `texture?`: GPUTexture -> a already bound texture. this texture is generated if not set
- `sampler?`: GPUSampler -> a sampler for reading color values at a given uv coordinate. default linear.
- `bitmap?`: ImageBitmap; -> a bitmap image as the texture.

**Important**: a color or bitmap is required.

### StandardMaterial
#### extends `BasicMaterial`
This material works the same as the `BasicMaterial`, but it reacts to light and receives shadows.

#### Example
```ts
// using a static color
const mat1 = new BasicMaterial({ color: new Color(0xFF00AA) });

// using a image texture
const img = fetch("/texture.png").then(res => res.blob()).then(createImageBitmap);
const mat2 = new BasicMaterial({ bitmap: img });
```

### Mesh
#### extends `Object3D`
This class represents a renderable object. it has a `Geometry` and `Material`.

#### Constructor
`Mesh(geometry: Geometry, material: Material)`

#### Example
```ts
const geo = new BoxGeometry(1, 1, 1);
const mat = new BasicMaterial({ color: Color.RED });
const mesh = new Mesh(geo, mat);
scene.add(mesh);
```

### Renderer
This is the WebGPU renderer.

#### Constructor
`Renderer(canvas: HTMLCanvasElement, device: GPUDevice)`

#### Methods
- `render(scene: Scene, camera: Camera)`: Renders a scene from a cameras view.

#### Example
```ts
const adapter = navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const canvas = document.querySelector("canvas");

const renderer = new Renderer(canvas, device);

function draw() {
    renderer.render(scene, camera);
    requestAnimationFrame(draw);
}
```

## Camera
#### extends `Object3D`
The Camera class is the baseclass for all camera types.

### PerspectiveCamera
#### extends `Camera`
This camera creates a perspective projection.

#### Constructor
`PerspectiveCamera(fov: number, aspect: number, near: number, far: number)` \
- `fov`: Full field of view in radians
- `aspect`: Aspect ratio (width / height)
- `near`: near clipping plane in world space 
- `far`: far clipping plane in world space

#### Example
```ts
const cam = new PerspectiveCamera(45 / 180 * Math.PI, canvas.width / canvas.height, 0.1, 100);
```

### OrthographicCamera
This camera creates a orthographic projection.

#### extends `Camera`
#### Constructor
`OrthographicCamera(left: number, right: number, top: number, bottom: number, near: number, far: number)` \
- `left`: clip left in world space
- `right`: clip right in world space
- `top`: clip top in world space
- `bottom`: clip bottom in world space
- `near`: near clipping plane in world space 
- `far`: far clipping plane in world space

## Util
### Color
#### Constructor
`Color(r: number, g: number, b: number)` \
- `r`: red channel (0 to 1)
- `g`: green channel (0 to 1)
- `b`: blue channel (0 to 1)


### Quaternion
Represents a rotation

#### Constructor
`Quaternion(x: number, y: number, z: number, w: number)` \

#### Methods
- `rotateX(n: number): void`: Rotates this Quaternion arround the X axis by N radians
- `rotateY(n: number): void`: Rotates this Quaternion arround the Y axis by N radians
- `rotateZ(n: number): void`: Rotates this Quaternion arround the Z axis by N radians
- `toAxisAngle(): [number, Vector3]`: Returns the quaternions as a normalized XYZ (1) euler angle (0).

### Vector3
Basic Vector3 implementation based on wgpu-matrix vec3.

#### Constructor
`Vector3(x: number, y: number, z: number)`

### Transform
Matrix4x4 which holds a position (Vector3), rotation (Quaternion) and scale (Vector3).

#### Constructor
`Transform()` -> default to identity

#### Methods
- `getBindGroup(device: GPUDevice): GPUBindGroup`: Creates and binds a GPUBindGroup. The bind group is stores. Calling it twice will have no effect
- `identity(): void`: Resets itself.
- `get asBuffer: Float32Array`: Creates a 16 length Float32Array with the full transformation matrix. 

## Light
Baseclass for all lights

### AmbientLight
The AmbientLight illuminates the entire scene. It has no position, does not cast shadows and is not distance based

#### extends `Light`
#### Constructor 
`AmbientLight(color: Color, intensity: number)` \
intensity 1 = fully illuminated

### DirectionalLight
The DirectionalLight illuminates the scene from a position (cone shaped). It has a direction, casts shadows and is distance based.

#### extends `Light`
#### Constructor
`DirectionalLight(intensity: number, decay: number, color: Color)` \
- decay = 0 -> infinite distance 
- decay = 1 -> linear decay
- decay > 1 -> exponential decay

#### Properties
- `innerCone`: Angle of the inner cone (ref Blender)
- `outerCone`: Angle of the outer cone (ref Blender)
- `spotIntensity`: How concentrated the light is to the center. 0 = equal distribution, 1 = laser.

### PointLight
The PointLight has a position and emits light in all directions. the intensity falls off over distance. This light has a position and is distance based. it does not cast shadows.

#### extends `Light`
#### Constructor
`PointLight(intensity: number, decay: number, color: Color)`

### SunLight
The SunLight only has a direction and can cast shadows. Its range is infinite.

#### extends `Light`
#### Constructor
`SunLight(intensity: number, color: Color, target: Vector3)`
- `target`: is the point it shines at, not the direction.

## Loaders
### GLTFLoader
Loads a GLTF JSON file (glb not supported).

#### Methods
- `fromURL(url: string, opts): Scene`: Loads a gltf file with embedded textures from a url. it returns a full scene with cameras, light, meshes and other objects.

#### Example
```ts
const scene = await GLTFLoader.fromURL("/island.gltf", {
    BaseMaterialClass: BasicMaterial
});
const [camera] = scene.readObjects(PerspectiveCamera);
camera.aspect = canvas.width / canvas.height;
const renderer = new Renderer(canvas, device);
renderer.render(camera, scene);
```

### OBJLoader
Loads a OBJ file (mtl not supported).

#### Methods
- `fromURL(url: string): Mesh[]`: Loads a OBJ file from a url and returns all meshes present. Does not load lights or materials.
- `fromContentsString(str: string): Mesh[]`: Loads meshes from the file contents