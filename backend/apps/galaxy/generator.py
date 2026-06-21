from __future__ import annotations

import math
import random
from typing import Any


def _get_nested(source: dict[str, Any], *keys: str, default: Any = None) -> Any:
    current: Any = source
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    return current


def _normalize_morphology(value: Any) -> str:
    normalized = str(value or "spiral").strip().lower().replace("-", "_").replace(" ", "_")
    aliases = {
        "barredspiral": "barred_spiral",
        "barred_spiral": "barred_spiral",
        "spiral": "spiral",
        "elliptic": "elliptical",
        "elliptical": "elliptical",
        "lenticular": "lenticular",
        "irregular": "irregular",
    }
    return aliases.get(normalized, "spiral")


def _blend(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def _metallicity_shift(metallicity: str, zone_rgb: tuple[int, int, int], rng: random.Random) -> tuple[int, int, int]:
    presets = {
        "very_low": (160, 214, 255),
        "low": (180, 224, 255),
        "solar": (255, 240, 210),
        "high": (255, 221, 168),
        "very_high": (255, 205, 130),
    }
    target = presets.get(metallicity, presets["solar"])
    bias = 0.55 + rng.random() * 0.2
    return _blend(zone_rgb, target, bias)


def _pick_control_value(params: dict[str, Any], key: str, default: int) -> int:
    controls = params.get("controls") if isinstance(params.get("controls"), dict) else {}
    try:
        return int(controls.get(key, default))
    except (TypeError, ValueError):
        return default


def build_galaxy_profile(seed: int, params: dict[str, Any] | None = None, image_size: int = 1536) -> dict[str, Any]:
    """Build a synthetic galaxy profile with star positions and rendering metadata."""
    params = params or {}
    rng = random.Random(seed)

    galaxy_properties = params.get("galaxyProperties") if isinstance(params.get("galaxyProperties"), dict) else {}
    morphology = _normalize_morphology(galaxy_properties.get("morphology") or params.get("morphology"))
    core_density = str(galaxy_properties.get("coreDensity") or "balanced").strip().lower()
    metallicity = str(galaxy_properties.get("metallicity") or "solar").strip().lower()
    try:
        age_byr = float(galaxy_properties.get("ageByr", 8.6))
    except (TypeError, ValueError):
        age_byr = 8.6

    density_bias = _pick_control_value(params, "densityBias", 50)
    anomaly_rate = _pick_control_value(params, "anomalyRate", 15)
    metallicity_bias = _pick_control_value(params, "metallicityBias", 50)
    core_intensity = _pick_control_value(params, "coreIntensity", 45)
    rift_spread = _pick_control_value(params, "riftSpread", 35)
    nebula_mix = _pick_control_value(params, "nebulaMix", 20)

    gu_scale_mpc = params.get("guScaleMpc")
    try:
        gu_scale_mpc = float(gu_scale_mpc)
    except (TypeError, ValueError):
        gu_scale_mpc = 1.0

    base_counts = {
        "spiral": 12000,
        "barred_spiral": 13500,
        "elliptical": 11000,
        "lenticular": 10000,
        "irregular": 9000,
    }
    base_count = base_counts.get(morphology, 12000)
    density_scale = 0.7 + (density_bias / 100.0) * 0.9
    size_scale = 0.8 + min(1.2, gu_scale_mpc)
    star_count = int(base_count * density_scale * size_scale)
    star_count = max(4500, min(star_count, 22000))

    center = image_size / 2
    radius = image_size * (0.20 + min(0.10, gu_scale_mpc * 0.03))
    core_radius = radius * (0.18 + core_intensity / 500.0)
    halo_radius = radius * (0.95 + rift_spread / 420.0)

    if core_density == "diffuse":
        core_multiplier = 0.72
    elif core_density == "dense":
        core_multiplier = 1.18
    elif core_density == "ultra_dense":
        core_multiplier = 1.38
    else:
        core_multiplier = 1.0

    if morphology == "spiral":
        arms = 4 if age_byr < 10.0 else 2
        twist = 4.2 + (12.0 - min(12.0, age_byr)) * 0.22
    elif morphology == "barred_spiral":
        arms = 2 if age_byr > 9.0 else 4
        twist = 3.8 + (12.0 - min(12.0, age_byr)) * 0.18
    elif morphology == "elliptical":
        arms = 0
        twist = 0.0
    elif morphology == "lenticular":
        arms = 0
        twist = 0.0
    else:
        arms = 3
        twist = 0.0

    zone_palette = {
        "core": (255, 244, 214),
        "bar": (255, 224, 190),
        "arm": (215, 231, 255),
        "rim": (170, 205, 255),
        "halo": (145, 180, 235),
        "clump": (255, 228, 160),
        "noise": (190, 210, 245),
    }

    stars: list[dict[str, Any]] = []

    def push_star(x: float, y: float, zone: str, size: int = 1, alpha: int = 255, z: float = 0.0) -> None:
        radial = math.hypot(x - center, y - center)
        fade = max(0.2, 1.0 - radial / (image_size * 0.52))
        brightness = max(0.25, min(1.0, fade))
        rgb = _metallicity_shift(metallicity, zone_palette.get(zone, zone_palette["noise"]), rng)
        alpha_final = int(max(40, min(255, alpha * brightness)))
        stars.append(
            {
                "x": float(x),
                "y": float(y),
                "z": float(z),
                "zone": zone,
                "size": int(size),
                "color": (rgb[0], rgb[1], rgb[2], alpha_final),
            }
        )

    def radial_noise(scale: float) -> float:
        return rng.gauss(0.0, scale)

    if morphology in {"spiral", "barred_spiral", "lenticular"}:
        for index in range(star_count):
            if morphology == "barred_spiral" and index < int(star_count * 0.12):
                bar_x = rng.uniform(-core_radius * 1.15, core_radius * 1.15)
                bar_y = rng.gauss(0.0, core_radius * 0.12)
                zone = "bar" if abs(bar_x) < core_radius * 0.35 else "core"
                push_star(center + bar_x, center + bar_y, zone, size=2 if zone == "bar" else 1, alpha=235)
                continue

            arm_index = index % max(1, arms)
            arm_offset = (2 * math.pi / max(1, arms)) * arm_index
            progress = rng.random() ** (0.55 if morphology == "spiral" else 0.75)
            radial = core_radius + (halo_radius - core_radius) * progress
            theta = arm_offset + progress * twist + radial_noise(0.16 + (1.0 - progress) * 0.25)

            spiral_x = center + math.cos(theta) * radial
            spiral_y = center + math.sin(theta) * radial
            wobble = (1.0 - progress) * radius * 0.08
            x = spiral_x + radial_noise(wobble)
            y = spiral_y + radial_noise(wobble)

            if radial < core_radius * 0.82:
                zone = "core"
            elif progress < 0.56:
                zone = "arm"
            elif progress < 0.84:
                zone = "rim"
            else:
                zone = "halo"

            if rng.random() < anomaly_rate / 100.0 * 0.08:
                zone = "clump"

            push_star(x, y, zone, size=2 if zone in {"core", "clump"} and rng.random() < 0.4 else 1, alpha=245)

    elif morphology == "elliptical":
        for _ in range(star_count):
            angle = rng.random() * math.tau
            radial = abs(rng.gauss(0.0, halo_radius * 0.42))
            flatten = 0.62 + (1.0 - core_multiplier) * 0.12
            x = center + math.cos(angle) * radial
            y = center + math.sin(angle) * radial * flatten
            if radial < core_radius * 0.9:
                zone = "core"
            elif radial < halo_radius * 0.55:
                zone = "arm"
            else:
                zone = "halo"
            push_star(x, y, zone, size=2 if zone == "core" else 1, alpha=220)

    elif morphology == "irregular":
        clumps = max(5, int(8 + anomaly_rate / 18))
        clump_centers = [
            (
                center + rng.uniform(-radius * 0.72, radius * 0.72),
                center + rng.uniform(-radius * 0.72, radius * 0.72),
                rng.uniform(0.18, 0.5) * radius,
            )
            for _ in range(clumps)
        ]
        for _ in range(star_count):
            cx, cy, cr = clump_centers[rng.randrange(0, len(clump_centers))]
            x = rng.gauss(cx, cr * 0.22)
            y = rng.gauss(cy, cr * 0.22)
            radial = math.hypot(x - center, y - center)
            if radial < core_radius * 0.7:
                zone = "core"
            elif radial < halo_radius * 0.55:
                zone = "clump"
            else:
                zone = "noise"
            push_star(x, y, zone, size=2 if zone in {"core", "clump"} else 1, alpha=220)

    else:
        for _ in range(star_count):
            angle = rng.random() * math.tau
            radial = abs(rng.gauss(0.0, halo_radius * 0.48))
            x = center + math.cos(angle) * radial
            y = center + math.sin(angle) * radial
            zone = "core" if radial < core_radius * 0.85 else "halo"
            push_star(x, y, zone, size=2 if zone == "core" else 1, alpha=225)

    # Add a low-density halo and a few higher-level outliers so the image reads as a galaxy shell.
    extra_halo = max(600, int(star_count * 0.08))
    for _ in range(extra_halo):
        angle = rng.random() * math.tau
        radial = halo_radius * (0.82 + rng.random() * 0.32)
        x = center + math.cos(angle) * radial + radial_noise(radius * 0.05)
        y = center + math.sin(angle) * radial + radial_noise(radius * 0.05)
        push_star(x, y, "halo", size=1, alpha=90)

    gu_radius = int(round(900.0 * gu_scale_mpc * core_multiplier))
    if morphology in {"elliptical", "lenticular"}:
        gu_radius = int(round(780.0 * gu_scale_mpc * core_multiplier))

    return {
        "seed": seed,
        "morphology": morphology,
        "ageByr": age_byr,
        "metallicity": metallicity,
        "coreDensity": core_density,
        "guScaleMpc": gu_scale_mpc,
        "galaxyRadiusGu": gu_radius,
        "densityBias": density_bias,
        "anomalyRate": anomaly_rate,
        "metallicityBias": metallicity_bias,
        "coreIntensity": core_intensity,
        "riftSpread": rift_spread,
        "nebulaMix": nebula_mix,
        "imageSize": image_size,
        "stars": stars,
    }
