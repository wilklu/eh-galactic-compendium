# /backend/galaxy/generator.py
from PIL import Image, ImageDraw

def render_y_axis_2d(stars_3d, out_path, width=2048, height=2048):
    img = Image.new("RGBA", (width, height), (0, 0, 0, 255))
    draw = ImageDraw.Draw(img)

    # compute bounds from x,z
    xs = [s["x"] for s in stars_3d]
    zs = [s["z"] for s in stars_3d]
    min_x, max_x = min(xs), max(xs)
    min_z, max_z = min(zs), max(zs)

    def map_range(v, a, b, c, d):
        if b - a == 0: 
            return (c + d) / 2
        return c + (v - a) * (d - c) / (b - a)

    for s in stars_3d:
        x2 = map_range(s["x"], min_x, max_x, 0, width-1)
        z2 = map_range(s["z"], min_z, max_z, 0, height-1)
        r = s.get("r", 1)  # brightness/size
        color = s.get("color", (255, 220, 120, 255))
        draw.ellipse((x2-r, z2-r, x2+r, z2+r), fill=color)

    img.save(out_path, "PNG")
