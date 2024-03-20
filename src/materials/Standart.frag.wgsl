@group(0) @binding(1) var<uniform> cameraPosition: vec4f;
@group(2) @binding(0) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;
@group(3) @binding(0) var<uniform> numLights: u32;
@group(3) @binding(1) var<storage> lights: array<Light>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f, // World position
    @location(1) fragUV: vec2f,
    @location(2) fragNormal: vec3f, // World normal
}

struct Light {
    position: vec3f,
    color: vec3f,
    data: array<f32, 16> // Additional data for light calculations
}

fn calcPointLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let intensity = light.data[1];
    let decay = light.data[2];
    let lightDirection = normalize(light.position - fragPosition);
    let distance = length(light.position - fragPosition);
    let attenuation = 1.0 / (1.0 + decay * distance * distance);
    let diffuseIntensity = max(dot(lightDirection, normal), 0.0);
    let diffuse = light.color * clamp(intensity * diffuseIntensity * attenuation, 0.0, 1.0);
    return diffuse;
}

fn calcSunLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let lightDirection = normalize(-light.position);
    let diffuseIntensity = max(dot(normal, lightDirection), 0.0);
    let diffuse = light.color * diffuseIntensity;
    return diffuse * light.data[1];
}

fn calcLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let lightType = i32(light.data[0]);
    switch lightType {
        case 0: { return light.color; } // Ambient light
        case 3: { return calcPointLight(light, fragPosition, normal); } // Point light
        case 4: { return calcSunLight(light, fragPosition, normal); } // Sun light
        default: { return vec3f(0.0); }
    }
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    var color = vec3f(0.0, 0.0, 0.0);
    for (var i = 0u; i < numLights; i++) {
        color += calcLight(lights[i], input.fragPosition.xyz, input.fragNormal);
    }

    let textureColor = textureSample(myTexture, mySampler, input.fragUV).rgb;
    let finalColor = color * textureColor;
    return vec4f(finalColor, 1.0);
}
