"""Cards, UI icons, card art, map nodes and the eclipse turn timer."""
from px import Canvas

# --- shared shapes -------------------------------------------------------------

def _golok(c, x, y, s=1):
    """Diagonal golok, handle at (x, y), blade toward upper right; s scales length."""
    c.line(x + 2, y - 2, x + 2 + 6 * s, y - 2 - 6 * s, "perak", w=2)
    c.line(x, y, x + 2, y - 2, "sogan", w=2)


def _gunungan(c, x, y, w, h, fill="prada"):
    c.poly([(x + w / 2, y), (x + w, y + h * 0.5), (x + w * 0.85, y + h), (x + w * 0.15, y + h), (x, y + h * 0.5)], fill)


def _shield(c, x, y, w, h, fill, rim="perak"):
    c.poly([(x, y), (x + w, y), (x + w, y + h * 0.55), (x + w / 2, y + h), (x, y + h * 0.55)], rim)
    c.poly([(x + 1, y + 1), (x + w - 1, y + 1), (x + w - 1, y + h * 0.55), (x + w / 2, y + h - 1.5), (x + 1, y + h * 0.55)], fill)


def _flame(c, x, y, w, h, outer="api", inner="api_terang"):
    c.poly([(x + w * 0.5, y), (x + w, y + h * 0.6), (x + w * 0.8, y + h), (x + w * 0.2, y + h), (x, y + h * 0.6)], outer)
    c.poly([(x + w * 0.5, y + h * 0.4), (x + w * 0.75, y + h * 0.75), (x + w * 0.5, y + h), (x + w * 0.25, y + h * 0.75)], inner)


def _kepeng(c, cx, cy, r):
    """Javanese coin with a square hole."""
    c.ellipse(cx, cy, r, r, "prada")
    c.rect(int(cx) - 1, int(cy) - 1, 2, 2, "malam")
    c.set(int(cx - r / 2), int(cy - r / 2), "prada_terang")


# --- 12x12 UI icons -------------------------------------------------------------

def _icon(draw):
    c = Canvas(12, 12)
    draw(c)
    return c


def _heart(c):
    c.ellipse(3.5, 4, 2.5, 2.5, "merah_gerhana"); c.ellipse(7.5, 4, 2.5, 2.5, "merah_gerhana")
    c.poly([(1, 4.5), (11, 4.5), (6, 10.5)], "merah_gerhana"); c.outline(); c.set(3, 3, "putih_kafan")


def _block(c):
    _shield(c, 2, 1, 8, 10, "nila"); c.outline(); c.set(4, 3, "putih_kafan")


def _wayang(c):
    _gunungan(c, 2, 1, 8, 9); c.outline(); c.dots([(6, 4), (6, 6)], "merah_gerhana")


def _coin(c):
    _kepeng(c, 5.5, 5.5, 4.2); c.outline()


def _jurus(c):
    for i in range(3):
        c.line(2 + i * 3, 9, 5 + i * 3, 2, "api")
    c.outline()


def _rentan(c):
    _shield(c, 2, 1, 8, 10, "darah"); c.outline(); c.line(6, 2, 5, 5, "malam"); c.line(5, 5, 7, 8, "malam")


def _lemah(c):  # damage down: the mirror of the evade chevrons
    for y in (1, 5):
        c.line(2, y, 6, y + 4, "kabut", w=2); c.line(6, y + 4, 10, y, "kabut")
    c.outline()


def _terbakar(c):
    _flame(c, 2, 1, 8, 10); c.outline()


def _serang(c):
    _golok(c, 2, 10); c.outline()


def _serang_semua(c):
    _golok(c, 1, 10); c.line(9, 10, 3, 3, "perak", w=2); c.line(10, 11, 9, 10, "sogan"); c.outline()


def _status(c):
    c.ellipse(6, 5, 4, 4, "putih_kafan"); c.rect(4, 8, 5, 3, "putih_kafan"); c.outline()
    c.dots([(4, 5), (5, 5), (7, 5), (8, 5)], "malam"); c.dots([(5, 10), (7, 10)], "malam")


def _curi(c):
    _kepeng(c, 4.5, 6.5, 3.5); c.line(7, 4, 10, 1, "merah_gerhana", w=2); c.outline()


def _kabur(c):
    c.ellipse(4, 7, 3, 3, "kabut"); c.ellipse(7, 6, 3, 3, "perak"); c.outline(); c.dots([(9, 9), (10, 10)], "kabut")


def _hindar(c):
    for y in (2, 6):
        c.line(2, y + 4, 6, y, "gaib", w=2); c.line(6, y, 10, y + 4, "gaib")
    c.outline()


def _ancang(c):
    c.ellipse(6, 6, 5, 5, "api"); c.outline(); c.rect(6, 2, 1, 5, "putih_kafan"); c.set(6, 9, "putih_kafan")


def _hisap(c):
    c.poly([(2, 1), (8, 1), (5, 7)], "putih_kafan"); c.ellipse(8, 9, 2, 2, "darah"); c.set(8, 7, "darah"); c.outline()


def _culik(c):
    _gunungan(c, 2, 1, 8, 9); c.outline(); c.line(4, 2, 8, 9, "malam")


def _ping(c):
    c.ellipse(6, 6, 5, 5, "gaib"); c.ellipse(6, 6, 3, 3, None); c.rect(5, 5, 2, 2, "gaib"); c.outline()


UI_ICONS = {
    "hp": _heart, "perisai": _block, "wayang": _wayang, "koin": _coin, "jurus": _jurus,
    "status_rentan": _rentan, "status_lemah": _lemah, "status_terbakar": _terbakar,
    "niat_serang": _serang, "niat_serang_semua": _serang_semua, "niat_status": _status,
    "niat_curi": _curi, "niat_kabur": _kabur, "niat_hindar": _hindar, "niat_ancang": _ancang,
    "niat_hisap": _hisap, "niat_culik": _culik, "ping": _ping,
}


# --- 24x24 card art (starter cards) --------------------------------------------

def _art(draw):
    c = Canvas(24, 24)
    draw(c)
    return c


def _tebas(c):
    c.poly([(3, 20), (6, 9), (14, 3), (8, 10)], "putih_kafan")            # slash arc
    _golok(c, 7, 21, 2); c.outline()
    c.dots([(19, 5), (20, 4)], "putih_kafan")


def _tangkis(c):
    _shield(c, 4, 2, 16, 20, "nila"); c.outline()
    c.ellipse(12, 10, 3, 3, "prada"); c.rect(11, 9, 2, 2, "nila"); c.dots([(7, 5), (16, 5)], "prada")


def _jurus_harimau(c):
    for i in range(3):
        c.line(4 + i * 6, 21, 10 + i * 6, 3, "api", w=2)
    c.outline()
    for i in range(3):
        c.line(5 + i * 6, 19, 9 + i * 6, 7, "api_terang")


def _pukul_wayang(c):
    c.poly([(6, 22), (9, 8), (13, 4), (15, 9), (12, 22)], "prada")         # puppet body, profile
    c.line(13, 6, 21, 10, "prada", w=2)                                    # long striking arm
    c.outline()
    c.dots([(12, 7)], "malam"); c.dots([(9, 14), (10, 17), (11, 20)], "sogan")
    c.dots([(21, 7), (22, 12), (19, 13), (23, 9)], "putih_kafan")          # impact


def _panggil_wayang(c):
    _gunungan(c, 3, 1, 18, 21); c.outline()
    c.ellipse(12, 10, 3, 4, "sogan"); c.dots([(12, 4), (8, 12), (16, 12), (12, 17), (12, 19)], "merah_gerhana")
    c.rect(11, 16, 3, 5, "sogan")


def _restu(c):
    c.rect(8, 18, 8, 4, "sogan")                                           # incense burner
    c.line(12, 17, 12, 10, "coklat")
    c.outline()
    for i, (x, y) in enumerate([(12, 8), (14, 6), (12, 4), (10, 2)]):
        c.ellipse(x, y, 2, 1.5, "kabut" if i % 2 else "perak")
    c.set(12, 10, "api_terang")
    c.dots([(5, 6), (19, 4), (18, 12), (6, 13)], "gaib")


CARD_ART = {
    "tebas": _tebas, "tangkis": _tangkis, "jurus_harimau": _jurus_harimau,
    "pukul_wayang": _pukul_wayang, "panggil_wayang": _panggil_wayang, "restu": _restu,
}


# --- 48x64 card frames -----------------------------------------------------------

CARD_TYPES = {  # border, banner
    "serang": ("merah_gerhana", "darah"),
    "tahan": ("kabut", "nila"),
    "bantu": ("lumut", "hutan"),
}


def card_frame(kind, upgraded=False):
    border, banner = CARD_TYPES[kind]
    rim = "prada" if upgraded else border
    c = Canvas(48, 64)
    c.rect(1, 0, 46, 64, "malam"); c.rect(0, 1, 48, 62, "malam")            # rounded silhouette
    c.rect(1, 1, 46, 62, rim)
    c.rect(3, 3, 42, 58, "nila_tua")
    c.rect(3, 3, 42, 9, banner)                                            # name banner
    c.rect(4, 13, 40, 27, "malam"); c.rect(5, 14, 38, 25, "nila_tua")      # art window
    c.rect(4, 42, 40, 18, "kulit"); c.rect(5, 43, 38, 16, "kulit_terang")  # lontar text panel
    for x, y in ((2, 2), (45, 2), (2, 61), (45, 61)):                       # kawung corner studs
        c.set(x, y, "prada_terang" if upgraded else "prada")
    c.poly([(24, 57), (27, 60), (24, 63), (21, 60)], rim)                  # type gem
    c.set(24, 60, "putih_kafan")
    if upgraded:
        for x in range(6, 43, 6):
            c.set(x, 1, "prada_terang")
    return c


def card_back():
    c = card_frame("tahan")
    c.rect(3, 3, 42, 58, "nila_tua")
    for y in range(6, 60, 8):                                              # kawung lattice
        for x in range(6 + (y // 8 % 2) * 4, 44, 8):
            c.dots([(x, y - 1), (x - 1, y), (x + 1, y), (x, y + 1)], "nila")
    c.ellipse(24, 30, 10, 10, "merah_gerhana")                             # eclipse
    c.ellipse(26, 29, 9, 9, "malam")
    c.rect(1, 1, 46, 2, "prada"); c.rect(1, 61, 46, 2, "prada")
    return c


# --- 16x16 map nodes -------------------------------------------------------------

def _node(draw):
    c = Canvas(16, 16)
    draw(c)
    return c


def _n_pertarungan(c):
    _golok(c, 2, 14, 1.6); c.line(13, 14, 4, 5, "perak", w=2); c.line(14, 15, 13, 14, "sogan", w=2); c.outline()


def _n_elite(c):
    c.ellipse(8, 8, 6, 6, "sogan_tua"); c.poly([(2, 4), (4, 0), (6, 4)], "putih_kafan"); c.poly([(10, 4), (12, 0), (14, 4)], "putih_kafan")
    c.outline(); c.rect(4, 7, 3, 2, "merah_gerhana"); c.rect(9, 7, 3, 2, "merah_gerhana"); c.rect(5, 11, 6, 1, "malam")


def _n_istirahat(c):
    c.poly([(1, 7), (8, 1), (15, 7)], "sogan"); c.rect(3, 7, 10, 1, "sogan_tua")      # pondok roof
    c.rect(4, 13, 8, 2, "coklat"); _flame(c, 5, 7, 6, 7); c.outline()


def _n_warung(c):
    c.rect(1, 3, 14, 4, "merah_gerhana")
    for x in range(1, 15, 4):
        c.rect(x, 3, 2, 4, "putih_kafan")
    c.rect(2, 7, 1, 7, "sogan"); c.rect(13, 7, 1, 7, "sogan"); c.rect(1, 11, 14, 3, "coklat")
    c.outline(); _kepeng(c, 8, 9, 1.6)


def _n_boss(c):
    c.ellipse(8, 8, 7, 7, "merah_gerhana"); c.ellipse(9, 7, 6, 6, "malam"); c.outline("darah"); c.dots([(3, 6), (4, 11)], "api_terang")


MAP_NODES = {
    "pertarungan": _n_pertarungan, "elite": _n_elite, "istirahat": _n_istirahat,
    "warung": _n_warung, "boss": _n_boss,
}


# --- eclipse turn timer: 8 frames, 24x24 -----------------------------------------

def eclipse_frames(n=8):
    """Frame 0 = full moon (turn just started), last = blood moon (time is up)."""
    tint = ["perak", "perak", "putih_kafan", "kulit_terang", "api_terang", "api", "merah_gerhana", "darah"]
    frames = []
    for i in range(n):
        c = Canvas(24, 24)
        if i == n - 1:
            c.ellipse(12, 12, 10, 10, "merah_gerhana"); c.ellipse(12, 12, 9, 9, "darah")
        else:
            c.ellipse(12, 12, 10, 10, tint[i])
            off = 21 - i * 21 / (n - 1)
            shadow = Canvas(24, 24)
            shadow.ellipse(12 + off, 12 - off * 0.2, 10, 10, "nila_tua")
            for y in range(24):                                            # shadow only where the moon is
                for x in range(24):
                    if c.get(x, y) and shadow.get(x, y):
                        c.set(x, y, "nila_tua")
        c.outline("nila")
        frames.append(c)
    return frames
