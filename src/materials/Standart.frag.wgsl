override shadowDepthTextureSize: f32;
override hasShadowMap: u32;
override mapsX: u32;
override mapsY: u32;
override maxNumLights: u32;

// Color
@group(2) @binding(0) var textureSampler: sampler;
@group(2) @binding(1) var bitmapTexture: texture_2d<f32>;

// Light
@group(3) @binding(0) var<uniform> numLights: u32;
@group(3) @binding(1) var<storage> lights: array<Light>;

// Shadow
@group(3) @binding(2) var shadowMap: texture_depth_2d;
@group(3) @binding(3) var shadowSampler: sampler_comparison;

// DUMMY
@group(3) @binding(4) var<storage> shadowMapIndices: array<u32>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) fragPosition: vec4f, // World position
    @location(1) fragUV: vec2f,
    @location(2) fragNormal: vec3f, // World normal
}

struct Light {
    position: vec4f,
    color: vec4f,
    data: array<f32, 16>, // Additional data for light calculations
    matrix: mat4x4f
}

fn calcPointLight(lightIndex: u32, fragPosition: vec3f, normal: vec3f) -> vec3f {
    let light = lights[lightIndex];
    let intensity = light.data[1];
    let decay = light.data[2];
    let lightDirection = normalize(light.position.xyz - fragPosition);
    let distance = length(light.position.xyz - fragPosition);
    let attenuation = 1.0 / (1.0 + decay * distance * distance);
    let diffuseIntensity = max(dot(lightDirection, normal), 0.0);
    let diffuse = light.color.xyz * clamp(intensity * diffuseIntensity * attenuation, 0.0, 1.0);
    return diffuse;
}

fn calcSunLight(lightIndex: u32, fragPosition: vec4f, normal: vec3f) -> vec3f {
    let light = lights[lightIndex];
    let visibility = select(calcShadowVisibility(lightIndex, fragPosition), 1.0, light.data[2] == 0.0);
    let intensity = light.data[1];

    let direction = light.position.xyz;
    let diffuseIntensity = max(dot(normalize(normal), direction), 0.0);
    let diffuse = light.color.xyz * diffuseIntensity;
    return diffuse * intensity * visibility;
}

fn calcSpotLight(lightIndex: u32, fragPosition: vec4f, normal: vec3f) -> vec3f {
    let light = lights[lightIndex];
    let visibility = select(calcShadowVisibility(lightIndex, fragPosition), 1.0, light.data[9] == 0.0);

    let intensity = light.data[1];
    let decay = light.data[2];
    let innerCone = cos(light.data[3]);
    let outerCone = cos(light.data[4]);
    let tar = vec3f(light.data[5], light.data[6], light.data[7]);
    let centerIntensity = light.data[8];
    let directionToLight = normalize(light.position.xyz - fragPosition.xyz);
    let distance = length(light.position.xyz - fragPosition.xyz);
    let attenuation = 1.0 / (1.0 + decay * distance * distance);
    
    // Direction from the light to the target
    let lightDirection = normalize(tar - light.position.xyz);
    // Calculate the angle between the light direction and the direction to the fragment
    let spotEffect = dot(directionToLight, -lightDirection);
    
    if(spotEffect > outerCone) {
        let diffuseIntensity = max(dot(directionToLight, normalize(normal)), 0.0);

        // Smooth interpolation between the inner and outer cone boundaries
        let spotIntensity = smoothstep(outerCone, innerCone, spotEffect);
        let sharpFalloffIntensity = pow(spotIntensity, centerIntensity);
        return vec3f(sharpFalloffIntensity * intensity * light.color.xyz * attenuation * diffuseIntensity) * visibility;
    } else {
        return vec3f(0.0); // Outside of the spotlight's cone
    }
}

fn calcShadowVisibility(lightIndex: u32, fragPosition: vec4f) -> f32 {
    let matrix = lights[lightIndex].matrix;
    let shadowMapIndex = shadowMapIndices[lightIndex];
    let shadowMapX: u32 = shadowMapIndex % mapsX;
    let shadowMapY: u32 = shadowMapIndex / mapsX;
    let axyy = f32(mapsX + mapsY + maxNumLights); // DUMMY, so mapsX and mapsY are not unused

    if (hasShadowMap == 0) {
        return 1.0;
    }
    
    let posFromLight = matrix * fragPosition;
    let shadowPosGlobal = vec3(
        posFromLight.x / posFromLight.w * 0.5 + 0.5,
        posFromLight.y / posFromLight.w * -0.5 + 0.5,
        posFromLight.z / posFromLight.w
    );

    let shadowPos = vec3(
        (shadowPosGlobal.x + f32(shadowMapX)) / f32(mapsX),
        (shadowPosGlobal.y + f32(shadowMapY)) / f32(mapsY),
        shadowPosGlobal.z
    );

    var visibility = 0.0;
    let oneOverShadowDepthTextureSize = 1.0 / shadowDepthTextureSize;
    for (var y = -1; y <= 1; y++) {
        for (var x = -1; x <= 1; x++) {
            let offset = vec2<f32>(vec2(x, y)) * oneOverShadowDepthTextureSize;

            let coord = vec2f((shadowPos.x + offset.x), shadowPos.y + offset.y);

            visibility += textureSampleCompare(
                shadowMap, shadowSampler, coord, shadowPos.z - 0.001
            ) / 9.0;
        }
    }

    return visibility;
}

fn calcLight(lightIndex: u32, fragPosition: vec4f, normal: vec3f) -> vec3f {
    let lightType = i32(lights[lightIndex].data[0]);
    switch lightType {
        case 0: { return lights[lightIndex].color.xyz; } // Ambient light
        case 1: { return calcSpotLight(lightIndex, fragPosition, normal); } // Spot / Directional light
        case 3: { return calcPointLight(lightIndex, fragPosition.xyz, normal); } // Point light
        case 4: { return calcSunLight(lightIndex, fragPosition, normal); } // Sun light
        default: { return vec3f(0.0); }
    }
}

@fragment
fn main(input: VertexOutput) -> @location(0) vec4f {
    var color = vec3f(0.0, 0.0, 0.0);
    for (var i = 0u; i < numLights; i++) {
        color += calcLight(i, input.fragPosition, input.fragNormal);
    }

    let textureColor = textureSample(bitmapTexture, textureSampler, input.fragUV).rgb;
    let finalColor = color * textureColor;
    return vec4f(finalColor, 1.0);
}
