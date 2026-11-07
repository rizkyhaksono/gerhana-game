"""Generate a 32x32 pixel-art knight sprite + animation sheets (Sweetie 16 palette).

Usage: python3 make_hero.py
Outputs:
  hero.png          32x32 still
  hero_idle.png     2 frames, 32x32 each
  hero_attack.png   4 frames, 56x32 each (wider: lunge + sword thrust)
  hero_hit.png      2 frames, 32x32 each
  hero_preview.png  still, 10x
All frames share a top-left anchor, so use centered=false in Godot.
"""
import struct
import zlib

PALETTE = {
    ".": None,                # transparent
    "K": (0x1A, 0x1C, 0x2C),  # outline
    "W": (0xF4, 0xF4, 0xF4),  # highlight
    "S": (0x94, 0xB0, 0xC2),  # steel
    "D": (0x56, 0x6C, 0x86),  # steel shadow
    "R": (0xB1, 0x3E, 0x53),  # tabard / plume
    "r": (0x5D, 0x27, 0x5D),  # cape shadow
    "Y": (0xFF, 0xCD, 0x75),  # gold
    "B": (0x33, 0x3C, 0x57),  # cloth / belt
    "E": (0x73, 0xEF, 0xF7),  # glowing eyes
    "C": (0x73, 0xEF, 0xF7),  # blade light
    "c": (0x41, 0xA6, 0xF6),  # blade dark
}

HELM = ".........KSSSSSSSSSSSSDDK......."
BODY = [
    "................KKK.............",
    "...............KRRRK............",
    "...............KRRRRK...........",
    "...............KRRRRK...........",
    "...........KKKKKKrRRKKK.........",
    "..........KWSSSSSSSSSSDK........",
    ".........KWSSSSSSSSSSSDDK.......",
    HELM,
    HELM,
    ".........KSKKKKKKKKKKKKDK.......",
    ".........KSKKKEEKKEEKKKDK.......",
    ".........KSKKKKKKKKKKKKDK.......",
    HELM,
    ".........KDSSSSSSSSSSDDDK.......",
    "..........KDDSSSSSSSSDDK........",
    "...........KKKKKKKKKKKK.........",
    "........" + ".KSSSKDDDDDDKSSSK." + "......",
    "........" + "KSWSSKRRRRRRKSSDDK" + "......",
    "........" + "KDSSDKRRYYRRKDSDDK" + "......",
    "........" + "KRKSSKRYYYYRKSSKRK" + "......",
    "........" + "KRKSSKRRYYRRKSSKKK" + "KKKKK.",
    "........" + "KRKSSKRRRRRRKSSSSS" + "SSSSK.",  # right hand
    "........" + "KRKSSKRRRRRRKSSDDD" + "SSDDK.",
    "........" + "KRKSDKBBYYBBKKKKKK" + "KKKKK.",
    "........" + ".KrrKRRRRRRRRKrrK." + "......",
    "........" + ".KrrKRRRKKRRRKrrK." + "......",
    "........" + ".KrrKBBBKKBBBKrrK." + "......",
    "........" + "..KrKBBBKKBBBKrK.." + "......",
    "........" + "....KDSDKKDSDK...." + "......",
    "........" + "...KDDSDKKDSDDK..." + "......",
    "........" + "...KKKKKKKKKKKK..." + "......",
    "................................",
]

# Sword held upright; pasted at (25, 4). Grip rows left blank so the hand shows.
SWORD_UP = (
    ["..KK..", ".KWCK."] + [".KCcK."] * 14
    + ["KYYYYK", "......", "......", ".KBBK.", ".KYYK.", "..KK.."]
)
# Sword thrust forward; pasted at (30, 18).
SWORD_FWD = [
    "KKK",
    "KYK",
    "KYK" + "K" * 13,
    "KYK" + "W" + "C" * 12 + "K",
    "KYK" + "c" * 12 + "K",
    "KYK" + "K" * 12,
    "KYK",
    "KKK",
]
SPEED_LINES = [("WWW", 0, 9), ("WWWW", 0, 17), ("WW", 1, 25)]


def blank(w, h=32):
    return [["."] * w for _ in range(h)]


def paste(canvas, rows, x, y):
    """Draw rows onto canvas at (x, y); '.' is transparent, off-canvas pixels are clipped."""
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            cx, cy = x + i, y + j
            if ch != "." and 0 <= cx < len(canvas[0]) and 0 <= cy < len(canvas):
                canvas[cy][cx] = ch
    return canvas


def to_rows(canvas):
    return ["".join(r) for r in canvas]


def pose(sword_fwd=False, crouch=False):
    """Knight + sword on a 56-wide canvas. crouch drops everything above the boots by 1px."""
    c = paste(blank(56), BODY, 0, 0)
    if sword_fwd:
        paste(c, SWORD_FWD, 30, 18)
    else:
        paste(c, SWORD_UP, 25, 4)
    rows = to_rows(c)
    if crouch:
        rows = ["." * 56] + rows[:27] + rows[28:]
    return rows


def frame(width, layers):
    c = blank(width)
    for rows, x, y in layers:
        paste(c, rows, x, y)
    return to_rows(c)


def flash(rows):
    return ["".join("." if ch == "." else "W" for ch in r) for r in rows]


def sheet(frames):
    return ["".join(f[j] for f in frames) for j in range(32)]


def write_png(path, rows, scale=1):
    """Write RGBA PNG with stdlib only; each sprite pixel becomes scale x scale."""
    h, w = len(rows) * scale, len(rows[0]) * scale
    raw = bytearray()
    for row in rows:
        line = bytearray()
        for ch in row:
            rgb = PALETTE[ch]
            px = bytes((0, 0, 0, 0)) if rgb is None else bytes((*rgb, 255))
            line += px * scale
        for _ in range(scale):
            raw += b"\x00" + line  # filter type 0
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


if __name__ == "__main__":
    assert len(BODY) == 32 and all(len(r) == 32 for r in BODY), [len(r) for r in BODY]

    still = frame(32, [(pose(), 0, 0)])
    idle = [still, frame(32, [(pose(crouch=True), 0, 0)])]
    attack = [
        frame(56, [(pose(crouch=True), -1, 0)]),                                   # wind-up
        frame(56, [([t], x, y) for t, x, y in SPEED_LINES] + [(pose(sword_fwd=True), 4, 0)]),  # thrust
        frame(56, [(pose(sword_fwd=True), 3, 0)]),                                 # follow-through
        frame(56, [(pose(), 1, 0)]),                                               # recover
    ]
    hit = [frame(32, [(flash(pose()), -1, 0)]), frame(32, [(pose(), -2, 0)])]

    outputs = {
        "hero.png": still,
        "hero_idle.png": sheet(idle),
        "hero_attack.png": sheet(attack),
        "hero_hit.png": sheet(hit),
    }
    for name, rows in outputs.items():
        assert len(rows) == 32 and len({len(r) for r in rows}) == 1, name
        assert set("".join(rows)) <= PALETTE.keys(), name
        write_png(name, rows)
    write_png("hero_preview.png", still, scale=10)
    print("ok:", ", ".join(list(outputs) + ["hero_preview.png"]))
