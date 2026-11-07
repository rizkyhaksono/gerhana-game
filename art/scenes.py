"""Backgrounds (320x180 base resolution), 9-slice UI pieces and the combat mockup."""
from px import Canvas, rng

W, H = 320, 180
GROUND = 112  # combat stage line: feet of every combatant stand here


def _sky(c, bands, top=0, bottom=GROUND):
    """Vertical gradient through `bands` with ordered dithering between them."""
    span = (bottom - top) / (len(bands) - 1)
    for i in range(len(bands) - 1):
        y0 = int(top + i * span)
        c.rect(0, y0, W, int(span) + 1, bands[i])
        c.dither(0, y0 + int(span * 0.5), W, int(span * 0.5) + 1, bands[i + 1], 8)


def _treeline(c, base, amp, color, seed, crowns):
    r = rng(seed)
    for x in range(W):
        top = base - int(amp * (0.5 + 0.5 * ((x * 7 + seed) % 23) / 23))
        c.rect(x, top, 1, GROUND - top + 1, color)
    for _ in range(crowns):
        c.ellipse(r.randint(0, W), base - amp - r.randint(0, 8), r.randint(8, 16), r.randint(6, 10), color)


def _ground(c, top_color, grass, seed):
    c.rect(0, GROUND, W, H - GROUND, top_color)
    r = rng(seed)
    for _ in range(90):
        x, y = r.randint(0, W), r.randint(GROUND, H)
        c.dots([(x, y), (x + 1, y - 1)], grass)


def hutan_larangan():
    c = Canvas(W, H)
    _sky(c, ["malam", "nila_tua", "nila", "kabut"])
    r = rng(3)
    for _ in range(60):
        c.set(r.randint(0, W), r.randint(0, 70), "perak")
    c.dither_ellipse(254, 40, 28, 28, "darah", 3)                          # red halo
    c.dither_ellipse(254, 40, 23, 23, "darah", 7)
    c.ellipse(254, 40, 19, 19, "merah_gerhana")
    c.ellipse(254, 40, 17, 17, "perak")                                    # moon being swallowed
    c.ellipse(260, 37, 17, 17, "malam")
    _treeline(c, 96, 18, "nila", 11, 18)                                   # far forest, blue with distance
    _treeline(c, 104, 14, "hutan_tua", 5, 14)
    c.dither(0, 98, W, 12, "kabut", 5)                                     # ground mist
    _ground(c, "hutan_tua", "hutan", 9)
    c.rect(0, 0, 26, GROUND, "malam")                                      # banyan trunk framing the left
    c.ellipse(30, 6, 40, 22, "malam")
    for x in range(30, 70, 5):                                             # hanging aerial roots
        c.line(x, 20, x + (x % 3) - 1, 40 + (x * 7) % 30, "malam")
    c.rect(300, 0, 20, GROUND, "malam")
    c.ellipse(296, 10, 30, 18, "malam")
    return c


def arena_banaspati():
    c = Canvas(W, H)
    _sky(c, ["malam", "darah", "merah_gerhana", "api"])
    c.dither_ellipse(160, 32, 30, 30, "api", 2)
    c.ellipse(160, 32, 22, 22, "merah_gerhana")                            # total eclipse
    c.ellipse(160, 32, 19, 19, "darah")
    for i, x in enumerate(range(10, W, 46)):                               # charred trunks
        c.rect(x, 50 + (i * 13) % 30, 6, GROUND, "malam")
        c.line(x + 3, 60 + (i * 13) % 30, x + 14, 48 + (i * 13) % 30, "malam", w=2)
    _ground(c, "sogan_tua", "darah", 4)
    r = rng(8)
    for _ in range(14):                                                    # flames at the ground line
        x = r.randint(0, W)
        h = r.randint(10, 24)
        c.poly([(x, GROUND), (x + 5, GROUND - h), (x + 10, GROUND)], "api")
        c.poly([(x + 3, GROUND), (x + 5, GROUND - h // 2), (x + 7, GROUND)], "api_terang")
    for _ in range(50):
        c.set(r.randint(0, W), r.randint(40, H), "api_terang")             # embers
    return c


def peta():
    """Map screen: indigo kawung batik with darker edges."""
    c = Canvas(W, H)
    c.rect(0, 0, W, H, "nila_tua")
    for y in range(8, H, 16):
        for x in range(8 + (y // 16 % 2) * 8, W, 16):
            for dx, dy in ((-3, 0), (3, 0), (0, -3), (0, 3)):
                c.ellipse(x + dx, y + dy, 2, 2, "nila")
            c.set(x, y, "prada")
    c.dither(0, 0, W, 12, "malam", 10)
    c.dither(0, H - 12, W, 12, "malam", 10)
    return c


# --- 9-slice UI --------------------------------------------------------------------

def panel():
    """24x24 panel, slice margins 6px: indigo fill, gold-leaf rim, kawung corners."""
    c = Canvas(24, 24)
    c.rect(1, 0, 22, 24, "malam"); c.rect(0, 1, 24, 22, "malam")
    c.rect(1, 1, 22, 22, "prada"); c.rect(2, 2, 20, 20, "nila_tua")
    for x, y in ((3, 3), (20, 3), (3, 20), (20, 20)):
        c.dots([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], "prada")
    return c


def button(state):
    """16x16 button, slice margins 4px. States: normal, hover, pressed, disabled."""
    fill, rim, shade = {
        "normal": ("sogan", "prada", "sogan_tua"),
        "hover": ("coklat", "prada_terang", "sogan"),
        "pressed": ("sogan_tua", "prada", "malam"),
        "disabled": ("nila", "kabut", "nila_tua"),
    }[state]
    c = Canvas(16, 16)
    c.rect(1, 0, 14, 16, "malam"); c.rect(0, 1, 16, 14, "malam")
    c.rect(1, 1, 14, 14, rim); c.rect(2, 2, 12, 12, fill)
    if state != "pressed":
        c.rect(2, 12, 12, 2, shade)                                        # bottom lip = raised
    else:
        c.rect(2, 2, 12, 2, shade)
    return c


def bar(kind):
    """34x5 bar frame or 32x3 fill. kind: frame, hp, perisai, wayang."""
    if kind == "frame":
        c = Canvas(34, 5)
        c.rect(0, 0, 34, 5, "malam"); c.rect(1, 1, 32, 3, "nila_tua")
        return c
    color, light = {"hp": ("merah_gerhana", "api"), "perisai": ("kabut", "perak"), "wayang": ("prada", "prada_terang")}[kind]
    c = Canvas(32, 3)
    c.rect(0, 0, 32, 3, color); c.rect(0, 0, 32, 1, light)
    return c


# --- combat mockup -----------------------------------------------------------------

def mockup(sprites, icons, cards, art, eclipse):
    """Compose one combat screen from the real assets to check scale and readability."""
    c = hutan_larangan()
    feet = lambda s: GROUND - s.h + 2
    for s, x in ((sprites["pendekar"], 46), (sprites["dalang"], 84)):
        c.paste(s, x, feet(s))
    enemies = [("tuyul", 196, "niat_curi"), ("kuntilanak", 232, "niat_status"), ("pocong", 268, "niat_serang")]
    for name, x, intent in enemies:
        s = sprites[name]
        c.paste(s, x, feet(s))
        c.paste(icons[intent], x + 10, feet(s) - 12)
    for x in (46, 84, 196, 232, 268):                                      # hp bars
        c.paste(bar("frame"), x - 1, GROUND + 4)
        fill = bar("hp")
        fill.rect(22, 0, 10, 3, None)
        c.paste(fill, x, GROUND + 5)
    c.paste(eclipse[3], 148, 4)
    hand = [("serang", "tebas"), ("tahan", "tangkis"), ("serang", "jurus_harimau"), ("bantu", "restu")]
    for i, (kind, name) in enumerate(hand):
        x, y = 58 + i * 52, 128 - (6 if i == 2 else 0)                     # third card lifted = selected
        c.paste(cards[kind], x, y)
        c.paste(art[name], x + 12, y + 14)
    c.paste(icons["ping"], 236, 64)
    return c
