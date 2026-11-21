"""Build the Tabyl logo kit from Rubik Bold outlines.

The mark is a Cyrillic «б» drawn to Rubik Bold metrics: a round sun sits in
the bowl, cut out with an even gap, so the bowl becomes a crescent and the
flag is Rubik's own ascender. Small sizes get a wider gap and a heavier
crescent so the parts stay separate at 16–32 px.

Usage: python build_logo.py <Rubik-Bold.ttf> <out_dir>
Needs: fonttools, skia-pathops.
"""
import os
import sys

import pathops
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

SUN = "#FFD43B"
INK = "#1D1A12"
INK_ON_DARK = "#F4EFE2"
CREAM = "#FBF7EE"
DARK = "#14120D"

ASC = 800          # top of the drawing area in font units (б ascender reaches 768)
TRACK = -10        # tightening between letters, font units


def glyph_path(font, ch, dx=0.0):
    """Glyph outline as a pathops Path, flipped to SVG y-down, shifted by dx."""
    gs = font.getGlyphSet()
    name = font.getBestCmap()[ord(ch)]
    path = pathops.Path()
    gs[name].draw(TransformPen(path.getPen(glyphSet=gs), (1, 0, 0, -1, dx, ASC)))
    return path


def outer_contour(path):
    """The largest contour of a path (the outside of «о»)."""
    best, best_area = None, -1.0
    for contour in path.contours:
        p = pathops.Path()
        pen = p.getPen()
        contour.draw(pen)
        b = p.bounds
        area = (b[2] - b[0]) * (b[3] - b[1])
        if area > best_area:
            best, best_area = p, area
    return best


def dilate(path, by):
    """Grow a filled shape by `by` units on every side."""
    ring = pathops.Path()
    path.draw(ring.getPen())
    ring.stroke(by * 2, pathops.LineCap.ROUND_CAP, pathops.LineJoin.ROUND_JOIN, 4)
    ring.convertConicsToQuads()
    return pathops.op(path, ring, pathops.PathOp.UNION)


def thicken(path, by):
    return dilate(path, by)


def circle(cx, cy, r):
    k = 0.5522847498 * r
    p = pathops.Path()
    p.moveTo(cx + r, cy)
    p.cubicTo(cx + r, cy + k, cx + k, cy + r, cx, cy + r)
    p.cubicTo(cx - k, cy + r, cx - r, cy + k, cx - r, cy)
    p.cubicTo(cx - r, cy - k, cx - k, cy - r, cx, cy - r)
    p.cubicTo(cx + k, cy - r, cx + r, cy - k, cx + r, cy)
    p.close()
    return p


def largest(path):
    best, best_a = None, -1.0
    for contour in path.contours:
        c = pathops.Path()
        contour.draw(c.getPen())
        x0, y0, x1, y1 = c.bounds
        if (x1 - x0) * (y1 - y0) > best_a:
            best, best_a = c, (x1 - x0) * (y1 - y0)
    return best


# Bowl geometry in font units (y-up, baseline 0), matched to Rubik Bold «б»:
# bowl spans x 43–574, y −10–530, so a circle of r 270 centred (308, 260).
BOWL_CX, BOWL_CY, BOWL_R = 308.0, 260.0, 270.0
SUN_R, SUN_SHIFT = 175.0, 95.0


def build_b(font, dx, gap, extra_weight=0.0):
    """Return (sun, ink) for the custom «б» at dx, in SVG (y-down) coordinates.

    The bowl is a circle the size of Rubik's bowl. The sun sits inside it,
    shifted right, and is cut out of the bowl with an even gap, so the dark part
    becomes a crescent: thick on the left like a normal stroke, thinning to
    nothing on the right. The flag is Rubik's own ascender, trimmed along the
    bowl circle so the join is seamless.
    """
    flip = (1, 0, 0, -1, dx, ASC)

    def to_svg(path):
        out = pathops.Path()
        path.draw(TransformPen(out.getPen(), flip))
        return out

    gs = font.getGlyphSet()
    raw = pathops.Path()
    gs[font.getBestCmap()[ord("б")]].draw(raw.getPen(glyphSet=gs))
    bowl = circle(BOWL_CX, BOWL_CY, BOWL_R)
    flag = largest(pathops.op(raw, circle(BOWL_CX, BOWL_CY, BOWL_R - 3), pathops.PathOp.DIFFERENCE))
    sun = circle(BOWL_CX + SUN_SHIFT, BOWL_CY, SUN_R)
    ink = pathops.op(pathops.op(bowl, dilate(sun, gap), pathops.PathOp.DIFFERENCE),
                     flag, pathops.PathOp.UNION)
    if extra_weight:
        ink = pathops.op(dilate(ink, extra_weight), dilate(sun, gap), pathops.PathOp.DIFFERENCE)
    return to_svg(sun), to_svg(ink)


def d(path):
    pen = SVGPathPen(None, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
    path.draw(pen)
    return pen.getCommands()


def bbox(*paths):
    xs0, ys0, xs1, ys1 = zip(*(p.bounds for p in paths))
    return min(xs0), min(ys0), max(xs1), max(ys1)


def wordmark(font, gap):
    hmtx = font["hmtx"]
    cmap = font.getBestCmap()
    x = 0.0
    ink = pathops.Path()
    sun = None
    for ch in "табыл":
        if ch == "б":
            s, a = build_b(font, x, gap)
            sun = s
            ink = pathops.op(ink, a, pathops.PathOp.UNION)
        else:
            ink = pathops.op(ink, glyph_path(font, ch, x), pathops.PathOp.UNION)
        x += hmtx[cmap[ord(ch)]][0] + TRACK + (24 if ch == "б" else 0)
    return sun, ink


def svg(view, body, title):
    x0, y0, w, h = view
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.0f} {y0:.0f} {w:.0f} {h:.0f}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


def main(font_path, out):
    font = TTFont(font_path)
    os.makedirs(out, exist_ok=True)

    # ---- wordmark (gap tuned for header sizes 20–40 px)
    sun, ink = wordmark(font, gap=28)
    x0, y0, x1, y1 = bbox(sun, ink)
    pad = 0
    view = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    variants = {
        "tabyl-wordmark.svg": (INK, SUN),
        "tabyl-wordmark-on-dark.svg": (INK_ON_DARK, SUN),
        "tabyl-wordmark-mono.svg": ("currentColor", "currentColor"),
    }
    for name, (ink_c, sun_c) in variants.items():
        body = f'<path fill="{sun_c}" d="{d(sun)}"/><path fill="{ink_c}" d="{d(ink)}"/>'
        open(os.path.join(out, name), "w").write(svg(view, body, "табыл"))

    # ---- mark: the «б» on its own, three optical sizes
    #   large  ≥ 96 px: same gap as the wordmark
    #   medium 33–95 px: wider gap, slightly heavier ascender
    #   small  ≤ 32 px: widest gap, heavier ascender
    sizes = {"large": (28, 0), "medium": (36, 8), "small": (46, 18)}
    marks = {}
    for key, (gap, weight) in sizes.items():
        s, a = build_b(font, 0, gap, weight)
        marks[key] = (s, a)
        x0, y0, x1, y1 = bbox(s, a)
        body = f'<path fill="{SUN}" d="{d(s)}"/><path fill="{INK}" d="{d(a)}"/>'
        open(os.path.join(out, f"tabyl-mark-{key}.svg"), "w").write(
            svg((x0, y0, x1 - x0, y1 - y0), body, "табыл"))

    # ---- app icons: mark centred optically on a square tile
    def icon(key, bg, ink_c, canvas=1024, mark_h=0.66, radius=None, maskable=False):
        s, a = marks[key]
        x0, y0, x1, y1 = bbox(s, a)
        h = (y1 - y0)
        scale = canvas * (mark_h * (0.8 if maskable else 1.0)) / h
        w = (x1 - x0) * scale
        # optical centre: the sun carries the weight, so sit the mark slightly low
        tx = (canvas - w) / 2 - x0 * scale + canvas * 0.012
        ty = (canvas - h * scale) / 2 - y0 * scale + canvas * 0.02
        rx = f' rx="{radius}"' if radius else ""
        body = (f'<rect width="{canvas}" height="{canvas}"{rx} fill="{bg}"/>'
                f'<g transform="translate({tx:.1f} {ty:.1f}) scale({scale:.4f})">'
                f'<path fill="{SUN}" d="{d(s)}"/><path fill="{ink_c}" d="{d(a)}"/></g>')
        return svg((0, 0, canvas, canvas), body, "табыл")

    tiles = {
        "icon-light.svg": icon("large", CREAM, INK),
        "icon-dark.svg": icon("large", DARK, INK_ON_DARK),
        "icon-medium-light.svg": icon("medium", CREAM, INK, mark_h=0.70),
        "icon-medium-dark.svg": icon("medium", DARK, INK_ON_DARK, mark_h=0.70),
        "icon-small-light.svg": icon("small", CREAM, INK, mark_h=0.80, radius=200),
        "icon-small-dark.svg": icon("small", DARK, INK_ON_DARK, mark_h=0.80, radius=200),
        "icon-maskable.svg": icon("large", CREAM, INK, maskable=True),
    }
    for name, content in tiles.items():
        open(os.path.join(out, name), "w").write(content)

    # ---- favicon that follows the browser theme
    s, a = marks["small"]
    x0, y0, x1, y1 = bbox(s, a)
    h = y1 - y0
    scale = 32 * 0.86 / h
    tx = (32 - (x1 - x0) * scale) / 2 - x0 * scale + 0.4
    ty = (32 - h * scale) / 2 - y0 * scale + 0.5
    fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
           f'<style>.i{{fill:{INK}}}@media (prefers-color-scheme:dark){{.i{{fill:{INK_ON_DARK}}}}}</style>'
           f'<g transform="translate({tx:.2f} {ty:.2f}) scale({scale:.5f})">'
           f'<path fill="{SUN}" d="{d(s)}"/><path class="i" d="{d(a)}"/></g></svg>\n')
    open(os.path.join(out, "favicon.svg"), "w").write(fav)
    print("wrote", sorted(os.listdir(out)))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
