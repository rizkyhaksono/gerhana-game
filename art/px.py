"""Tiny pixel-art raster for Gerhana: named palette, shape fills, auto-outline, PNG export.

Stdlib only. Colors are palette names; None is transparent.
"""
import random
import struct
import zlib

# Palette "Malam Gerhana": eclipse night, batik sogan, wayang gold leaf, blood moon, forest, spirit glow.
PALETTE = {
    "malam": "0f0d1f",          # outline, deepest night
    "nila_tua": "1e1b3a",       # indigo dye, dark
    "nila": "2f3a6b",
    "kabut": "5b6e99",          # mist
    "perak": "a9b8cf",          # moonlight silver
    "putih_kafan": "ece6d6",    # shroud white
    "sogan_tua": "3a2318",      # batik sogan brown, dark
    "sogan": "6b3f24",
    "coklat": "a8703f",
    "kulit": "d9a066",          # skin
    "kulit_terang": "f0c999",   # skin light / lontar leaf
    "prada": "e8b83a",          # wayang gold leaf
    "prada_terang": "ffe58a",
    "darah": "7a1c24",
    "merah_gerhana": "c23a2b",  # eclipse red
    "api": "f26b21",
    "api_terang": "ffb23f",
    "hutan_tua": "16302a",
    "hutan": "2c5a3f",
    "lumut": "6f9a4a",
    "gaib": "54e0c8",           # spirit glow
    "tinta": "ffffff",          # font ink only: Godot tints it with font_color
}
RGB = {k: tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in PALETTE.items()}

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.px = [[None] * w for _ in range(h)]

    def set(self, x, y, c):
        if 0 <= x < self.w and 0 <= y < self.h:
            assert c is None or c in RGB, c
            self.px[y][x] = c

    def get(self, x, y):
        return self.px[y][x] if 0 <= x < self.w and 0 <= y < self.h else None

    def rect(self, x, y, w, h, c):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, c)

    def ellipse(self, cx, cy, rx, ry, c):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.set(x, y, c)

    def poly(self, pts, c):
        """Fill polygon; pixel (x, y) is inside when its center is."""
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            for x in range(int(min(xs)), int(max(xs)) + 1):
                px, py, inside = x + 0.5, y + 0.5, False
                for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1]):
                    if (y0 > py) != (y1 > py) and px < x0 + (py - y0) * (x1 - x0) / (y1 - y0):
                        inside = not inside
                if inside:
                    self.set(x, y, c)

    def line(self, x0, y0, x1, y1, c, w=1):
        x0, y0, x1, y1 = (int(round(v)) for v in (x0, y0, x1, y1))  # float ends would never meet the target
        dx, dy = abs(x1 - x0), -abs(y1 - y0)
        sx, sy = (1 if x0 < x1 else -1), (1 if y0 < y1 else -1)
        err = dx + dy
        while True:
            for i in range(w):
                self.set(x0 + i, y0, c)
            if (x0, y0) == (x1, y1):
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                x0 += sx
            if e2 <= dx:
                err += dx
                y0 += sy

    def dots(self, pts, c):
        for x, y in pts:
            self.set(x, y, c)

    def outline(self, c="malam"):
        """Draw a 1px outline around every filled pixel (4-neighbour)."""
        edge = [
            (x, y)
            for y in range(self.h)
            for x in range(self.w)
            if self.px[y][x] is None
            and any(self.get(x + dx, y + dy) is not None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        ]
        self.dots(edge, c)

    def dither(self, x, y, w, h, c, level):
        """Ordered-dither fill: level 0..16 = share of pixels set."""
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                if BAYER4[yy % 4][xx % 4] < level:
                    self.set(xx, yy, c)

    def dither_ellipse(self, cx, cy, rx, ry, c, level):
        for y in range(int(cy - ry), int(cy + ry) + 1):
            for x in range(int(cx - rx), int(cx + rx) + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0 and BAYER4[y % 4][x % 4] < level:
                    self.set(x, y, c)

    def paste(self, other, x, y):
        for yy in range(other.h):
            for xx in range(other.w):
                if other.px[yy][xx] is not None:
                    self.set(x + xx, y + yy, other.px[yy][xx])
        return self

    def map(self, fn):
        out = Canvas(self.w, self.h)
        out.px = [[None if p is None else fn(p) for p in row] for row in self.px]
        return out

    def flip(self):
        out = Canvas(self.w, self.h)
        out.px = [row[::-1] for row in self.px]
        return out

    def save(self, path, scale=1):
        raw = bytearray()
        for row in self.px:
            line = b"".join((bytes((0, 0, 0, 0)) if p is None else bytes((*RGB[p], 255))) * scale for p in row)
            raw += (b"\x00" + line) * scale
        def chunk(tag, data):
            return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))
        png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", self.w * scale, self.h * scale, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b"")
        with open(path, "wb") as f:
            f.write(png)


def sheet(frames, gap=0):
    out = Canvas(sum(f.w for f in frames) + gap * (len(frames) - 1), max(f.h for f in frames))
    x = 0
    for f in frames:
        out.paste(f, x, 0)
        x += f.w + gap
    return out


def rng(seed):
    return random.Random(seed)


# --- animation from one still -------------------------------------------------
PAD = 8  # every frame is (w + 2*PAD) x h with the sprite at x = PAD, so all animations share one anchor


def _crouch(src):
    """Drop everything above the feet by 1px (the row just above the feet is lost)."""
    out = Canvas(src.w, src.h)
    feet = src.h - 3
    out.px = [[None] * src.w] + [r[:] for r in src.px[: feet - 1]] + [r[:] for r in src.px[feet:]]
    return out


def _frame(src, dx, crouch=False, flash=False, speed=0):
    c = Canvas(src.w + 2 * PAD, src.h)
    s = _crouch(src) if crouch else src
    if flash:
        s = s.map(lambda p: "putih_kafan")
    if speed:  # speed lines behind the body
        back = PAD - 6 if speed > 0 else PAD + src.w + 1
        for i, y in enumerate((src.h // 3, src.h // 2, src.h * 2 // 3)):
            c.rect(back + (i % 2), y, 5, 1, "perak")
    return c.paste(s, PAD + dx, 0)


def animate(src, facing):
    """idle (2), attack (4), hit (2) frames; facing +1 = right (heroes), -1 = left (enemies)."""
    k = max(1, src.w // 32)
    f = facing
    return {
        "idle": [_frame(src, 0), _frame(src, 0, crouch=True)],
        "attack": [
            _frame(src, -2 * k * f, crouch=True),
            _frame(src, 6 * k * f, speed=f),
            _frame(src, 4 * k * f),
            _frame(src, 1 * k * f),
        ],
        "hit": [_frame(src, -2 * k * f, flash=True), _frame(src, -3 * k * f)],
    }
