// Color
@group(2) @binding(0) var mySampler: sampler;
@group(2) @binding(1) var myTexture: texture_2d<f32>;

// Light
@group(3) @binding(0) var<uniform> numLights: u32;
@group(3) @binding(1) var<storage> lights: array<Light>;

// Shadow
@group(3) @binding(2) var shadowMap: texture_depth_2d;
@group(3) @binding(3) var shadowSampler: sampler_comparison;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f, // World position
    @location(1) fragUV: vec2f,
    @location(2) fragNormal: vec3f, // World normal
}

struct Light {
    position: vec3f,
    color: vec3f,
    data: array<f32, 16>, // Additional data for light calculations
    matrix: mat4x4f
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
    let fragPosLightSpace = light.matrix * vec4(fragPosition, 1.0);
    
    let shadowPos = vec3(
        fragPosLightSpace.xy * vec2(0.5, -0.5) + vec2(0.5),
        fragPosLightSpace.z
    );
    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / 256.0;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
        let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;

        visibility += textureSampleCompare(
            shadowMap, shadowSampler,
            shadowPos.xy + offset, shadowPos.z - 0.001
        );
        }
    }
    visibility /= 9.0;
    
    let lightDirection = normalize(-light.position);
    let diffuseIntensity = max(dot(normalize(normal), lightDirection), 0.0);
    let diffuse = light.color * diffuseIntensity;
    return diffuse * light.data[1] * max(visibility, 0.1);
}

fn calcSpotLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let intensity = light.data[1];
    let decay = light.data[2];
    let innerCone = cos(light.data[3]);
    let outerCone = cos(light.data[4]);
    let tar = vec3f(light.data[5], light.data[6], light.data[7]);
    let centerIntensity = light.data[8];
    let directionToLight = normalize(light.position - fragPosition);
    let distance = length(light.position - fragPosition);
    let attenuation = 1.0 / (1.0 + decay * distance * distance);
    
    // Direction from the light to the target
    let lightDirection = normalize(tar - light.position);
    // Calculate the angle between the light direction and the direction to the fragment
    let spotEffect = dot(directionToLight, -lightDirection);
    
    if(spotEffect > outerCone) {
        let diffuseIntensity = max(dot(directionToLight, normalize(normal)), 0.0);
        // let diffuseIntensity = clamp(dot(directionToLight, normal), 0.0, 1.0);

        // Smooth interpolation between the inner and outer cone boundaries
        let spotIntensity = smoothstep(outerCone, innerCone, spotEffect);
        let sharpFalloffIntensity = pow(spotIntensity, centerIntensity);
        return vec3f(sharpFalloffIntensity * intensity * light.color * attenuation * diffuseIntensity);
    } else {
        return vec3f(0.0); // Outside of the spotlight's cone
    }
}

fn calcDirectionalLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let intensity = light.data[1];
    let decay = light.data[2];
    let lightDirection = normalize(vec3f(light.data[3], light.data[4], light.data[5]));
    let fov = light.data[6];
    let near = light.data[7];
    let far = light.data[8];
    let distance = length(light.position - fragPosition);

    if (distance > far || distance < near) {
        return vec3f(0.0);
    }

    let angle = dot(normal, -lightDirection);
    let cone = (angle - cos(fov * 0.5)) / (cos(fov * 0.5));
    if (cone < 0.0) {
        return vec3f(0.0);
    }


    let attenuation = 1.0 / (1.0 + decay * distance * distance);
    let diffuseIntensity = max(dot(lightDirection, normal), 0.0);
    let diffuse = light.color * clamp(intensity * diffuseIntensity * attenuation, 0.0, 1.0);
    return diffuse;
}

fn calcLight(light: Light, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let lightType = i32(light.data[0]);
    switch lightType {
        case 0: { return light.color; } // Ambient light
        case 1: { return calcSpotLight(light, fragPosition, normal); } // Spot light
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
