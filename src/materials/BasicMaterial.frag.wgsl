@group(0) @binding(0) var<uniform> cameraMatrix : mat4x4f;

@group(2) @binding(0) var mySampler : sampler;
@group(2) @binding(1) var myTexture : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f,
    @location(1) fragUV: vec2f,
    @location(2) fragNormal: vec3f
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    let color = textureSample(myTexture, mySampler, input.fragUV);
    // return vec4f(color.a, color.a, color.a, 1.0);
    return color;

    // Extract the forward direction from the view-projection matrix
    /*let forward = -normalize(vec3f(cameraMatrix[0][2], cameraMatrix[1][2], cameraMatrix[2][2]));

    // Normalize the normal vector since it might not be normalized
    let normal = normalize(input.fragNormal);

    // Calculate the dot product
    let cosTheta = dot(normal, forward);

    // Modulate the color by the absolute value of the cosine of the angle
    return color * (1 - cosTheta);*/
}