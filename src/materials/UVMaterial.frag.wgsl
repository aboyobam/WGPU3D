struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f,
    @location(1) fragUV: vec2f,
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    return vec4f(input.fragUV, 0.5, 1.0);
}