@group(2) @binding(0) var mySampler : sampler;
@group(2) @binding(1) var myTexture : texture_2d<f32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f,
    @location(1) fragUV: vec2f,
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    return textureSample(myTexture, mySampler, input.fragUV);
}