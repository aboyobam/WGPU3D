@group(0) @binding(0) var<uniform> cameraMatrix : mat4x4f;
@group(1) @binding(0) var<uniform> modelMatrix : mat4x4f;

struct VertexInput {
    @location(0) position: vec3f,
    @location(1) normal: vec3f,
    @location(2) uv: vec2f
}

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f,
    @location(1) fragUV: vec2f,
    @location(2) fragNormal: vec3f,
}

@vertex
fn main(input: VertexInput) -> VertexOutput{
    var output: VertexOutput;

    let worldPosition = modelMatrix * vec4(input.position, 1.0);
    output.position = cameraMatrix * worldPosition;
    output.fragPosition = worldPosition;
    output.fragUV = input.uv;
    output.fragNormal = (modelMatrix * vec4f(input.normal, 0.0)).xyz;
    
    return output;
}