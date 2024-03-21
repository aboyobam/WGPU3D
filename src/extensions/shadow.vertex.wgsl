@group(0) @binding(0) var<uniform> lightMatrix : mat4x4f;
@group(1) @binding(0) var<uniform> modelMatrix : mat4x4f;

@vertex
fn main(@location(0) position: vec3f) -> @builtin(position) vec4f {
  return lightMatrix * modelMatrix * vec4f(position, 1.0);
}
