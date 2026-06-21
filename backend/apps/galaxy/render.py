from __future__ import annotations

import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter


def render_galaxy_png(profile: dict[str, Any], out_path: str | Path, size: int = 1536) -> str:
    """Render a transparent galaxy PNG that can be used as an overlay."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    star_draw = ImageDraw.Draw(image)

    center = size / 2
    morphology = str(profile.get("morphology") or "spiral")
    stars = profile.get("stars") or []

    # Broad structural glow so the overlay reads as a galaxy shell/container.
    glow_colors = {
        "spiral": (80, 155, 255, 65),
        "barred_spiral": (95, 180, 255, 72),
        "elliptical": (255, 220, 180, 70),
        "lenticular": (240, 230, 190, 68),
        "irregular": (145, 200, 255, 60),
    }
    core_color = glow_colors.get(morphology, (100, 160, 255, 65))

    for radius, alpha_scale in [(0.16, 1.0), (0.29, 0.5), (0.46, 0.28)]:
        rgba = (core_color[0], core_color[1], core_color[2], int(core_color[3] * alpha_scale))
        glow_draw.ellipse(
            (
                center - size * radius,
                center - size * radius,
                center + size * radius,
                center + size * radius,
            ),
            fill=rgba,
        )

    # Morphology zone hints for visual read.
    if morphology in {"spiral", "barred_spiral"}:
        arm_color = (110, 180, 255, 26)
        for offset in [0.0, 1.55, 3.1, 4.65]:
            points = []
            for t in range(0, 170):
                progress = t / 170.0
                radius = size * (0.09 + progress * 0.34)
                angle = offset + progress * 5.5
                x = center + radius * math.cos(angle)
                y = center + radius * math.sin(angle)
                points.append((x, y))
            if len(points) > 1:
                glow_draw.line(points, fill=arm_color, width=3, joint="curve")

    elif morphology == "elliptical":
        glow_draw.ellipse((center - size * 0.33, center - size * 0.25, center + size * 0.33, center + size * 0.25), outline=(255, 230, 200, 38), width=3)
    elif morphology == "lenticular":
        glow_draw.ellipse((center - size * 0.38, center - size * 0.16, center + size * 0.38, center + size * 0.16), outline=(245, 230, 180, 34), width=3)

    glow = glow.filter(ImageFilter.GaussianBlur(radius=max(8, size // 110)))
    image = Image.alpha_composite(glow, image)
    star_draw = ImageDraw.Draw(image)

    for star in stars:
        x = float(star.get("x", center))
        y = float(star.get("y", center))
        color = tuple(star.get("color", (255, 255, 255, 255)))
        zone = str(star.get("zone") or "noise")
        size_px = int(star.get("size", 1))

        # Slightly larger points for the core and clumps so density contrast is visible.
        if zone in {"core", "clump"}:
            size_px = max(1, size_px + 1)

        if 0 <= x < size and 0 <= y < size:
            star_draw.ellipse((x - size_px, y - size_px, x + size_px, y + size_px), fill=color)

    image.save(out_path, format="PNG")
    return str(out_path)
