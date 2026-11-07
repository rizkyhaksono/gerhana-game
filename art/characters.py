"""Heroes (face right) and creatures (face left) for Gerhana. Each function returns one still Canvas."""
from px import Canvas, rng


def pendekar():
    """Pendekar Silat: black pangsi, red sash, batik iket, golok raised."""
    c = Canvas(32, 32)
    c.poly([(5, 6), (11, 5), (11, 9), (6, 12)], "sogan")              # iket tail
    c.poly([(11, 25), (15, 25), (12, 30), (8, 30)], "nila_tua")          # back leg
    c.poly([(17, 25), (21, 25), (25, 30), (21, 30)], "nila_tua")         # front leg
    c.poly([(10, 21), (22, 21), (23, 27), (9, 27)], "sogan")             # kain wrap
    c.rect(11, 15, 11, 7, "nila_tua")                                    # torso
    c.ellipse(10, 19, 2, 3, "nila_tua")                                  # back arm
    c.ellipse(16, 10, 6, 6, "kulit")                                     # head
    c.ellipse(16, 7, 7, 3, "sogan")                                      # iket band
    c.rect(9, 8, 15, 3, None)
    c.ellipse(16, 10, 6, 6, "kulit")
    c.rect(9, 5, 15, 3, "sogan")
    c.rect(21, 17, 4, 2, "nila_tua")                                     # front arm
    c.rect(25, 16, 2, 3, "kulit")                                        # fist
    c.line(26, 15, 29, 6, "perak", w=2)                                  # golok
    c.outline()
    c.rect(26, 16, 1, 3, "sogan_tua")                                    # grip
    c.dots([(29, 6), (30, 6)], "putih_kafan")                            # blade glint
    c.dots([(18, 10), (18, 11), (21, 10), (21, 11)], "malam")            # eyes
    c.rect(19, 13, 2, 1, "sogan")                                        # mouth
    c.dots([(13, 8), (12, 9)], "kulit_terang")                           # moonlight on cheek
    c.rect(11, 21, 11, 1, "merah_gerhana")                               # sash
    c.dots([(11, 24), (14, 24), (17, 24), (20, 24), (12, 26), (18, 26)], "prada")   # batik dots
    c.dots([(11, 6), (14, 6), (17, 6), (20, 6)], "prada")
    c.rect(8, 30, 4, 1, "sogan_tua")
    c.rect(21, 30, 4, 1, "sogan_tua")
    return c


def dalang():
    """Dalang: blangkon, indigo beskap, jarik, gunungan puppet held high."""
    c = Canvas(32, 32)
    c.line(20, 22, 24, 13, "sogan_tua", w=2)                             # puppet stick
    c.poly([(25, 1), (30, 8), (29, 14), (21, 14), (20, 8)], "prada")     # gunungan
    c.poly([(10, 23), (20, 23), (21, 30), (9, 30)], "sogan")             # jarik
    c.poly([(9, 15), (19, 15), (21, 24), (8, 24)], "nila")               # beskap
    c.ellipse(15, 11, 5, 5, "kulit")                                     # head
    c.ellipse(15, 8, 6, 3, "sogan")                                      # blangkon
    c.rect(9, 9, 13, 3, None)
    c.ellipse(15, 11, 5, 5, "kulit")
    c.rect(9, 6, 13, 3, "sogan")
    c.ellipse(9, 10, 2, 2, "sogan")                                      # mondolan knot
    c.line(18, 19, 21, 21, "nila", w=2)                                  # arm to stick
    c.outline()
    c.dots([(20, 21), (21, 21), (20, 22)], "kulit")                      # hand
    c.dots([(25, 4), (24, 7), (26, 7), (25, 10), (23, 11), (27, 11)], "sogan")    # gunungan carving
    c.dots([(25, 6), (25, 8)], "merah_gerhana")
    c.dots([(17, 11), (17, 12), (19, 11), (19, 12)], "malam")            # eyes
    c.rect(17, 14, 3, 1, "malam")                                        # moustache
    c.dots([(11, 8), (14, 7), (17, 7)], "prada")                         # blangkon batik
    c.dots([(14, 17), (15, 19), (16, 21)], "prada")                      # beskap buttons
    c.dots([(11, 26), (14, 27), (17, 26), (12, 29), (18, 29)], "prada")  # jarik parang hint
    c.rect(9, 30, 12, 1, "sogan_tua")
    return c


def tuyul():
    c = Canvas(32, 32)
    c.rect(13, 22, 7, 5, "perak")                                        # body
    c.rect(13, 25, 7, 3, "putih_kafan")                                  # loincloth
    c.rect(13, 28, 2, 2, "perak")
    c.rect(18, 28, 2, 2, "perak")
    c.ellipse(16, 16, 7, 6, "perak")                                     # big bald head
    c.poly([(8, 14), (10, 16), (8, 18)], "perak")                        # ears
    c.poly([(24, 14), (22, 16), (24, 18)], "perak")
    c.line(12, 23, 9, 25, "perak", w=2)                                  # arm holding coin
    c.ellipse(7, 25, 2, 2, "prada")
    c.outline()
    c.dots([(7, 24)], "prada_terang")
    c.dots([(12, 15), (13, 15), (12, 16), (17, 15), (18, 15), (17, 16)], "gaib")  # eyes
    c.rect(12, 19, 6, 1, "malam")                                        # grin
    c.dots([(13, 20), (16, 20)], "putih_kafan")
    c.dots([(20, 12), (21, 13), (19, 21)], "kabut")                      # shade
    return c


def kuntilanak():
    c = Canvas(32, 32)
    c.poly([(9, 4), (22, 4), (25, 26), (6, 27)], "malam")                # hair mass
    pts = [(11, 15), (20, 15), (25, 30), (6, 30)]
    c.poly(pts, "putih_kafan")                                           # dress
    for x in range(6, 26, 3):                                            # ragged hem
        c.set(x, 30, None)
    c.ellipse(15, 10, 4, 5, "putih_kafan")                               # face
    c.poly([(10, 4), (21, 4), (20, 9), (17, 7), (13, 8), (10, 11)], "nila_tua")  # bangs
    c.line(11, 18, 4, 21, "putih_kafan", w=2)                            # reaching arm
    c.outline()
    c.dots([(3, 21), (3, 22), (4, 23)], "perak")                         # claws
    c.dots([(13, 10), (16, 10)], "merah_gerhana")                        # eyes
    c.rect(14, 13, 2, 1, "darah")
    c.dots([(20, 20), (21, 24), (22, 28), (19, 26)], "perak")            # folds
    return c


def pocong():
    c = Canvas(32, 32)
    c.ellipse(16, 18, 6, 12, "putih_kafan")                              # shroud
    c.poly([(14, 2), (18, 2), (19, 6), (13, 6)], "putih_kafan")          # top knot
    c.outline()
    c.ellipse(14, 12, 3, 3, "lumut")                                     # face opening
    c.dots([(13, 11), (15, 11)], "malam")
    c.dots([(13, 12), (15, 12)], "gaib")
    c.rect(11, 17, 11, 1, "perak")                                       # ties
    c.rect(12, 27, 9, 1, "perak")
    c.rect(14, 6, 5, 1, "perak")
    c.dots([(19, 20), (20, 23), (19, 25), (20, 10)], "perak")            # cloth folds
    return c


def babi_ngepet():
    c = Canvas(32, 32)
    c.ellipse(18, 20, 10, 6, "nila_tua")                                 # body
    for x in (11, 14, 21, 24):                                           # legs
        c.rect(x, 24, 2, 5, "nila_tua")
    c.ellipse(9, 19, 5, 5, "nila_tua")                                   # head
    c.poly([(9, 12), (12, 15), (8, 15)], "nila_tua")                     # ear
    c.rect(3, 19, 3, 3, "darah")                                         # snout
    c.ellipse(22, 12, 3, 3, "sogan")                                     # loot sack
    c.outline()
    c.dots([(3, 20), (3, 21)], "malam")                                  # nostril
    c.dots([(7, 17)], "merah_gerhana")                                   # eye
    c.dots([(5, 23), (5, 24)], "putih_kafan")                            # tusk
    c.dots([(22, 11), (23, 12)], "prada")                                # coin
    for x in range(10, 27):                                              # moonlit back so it reads on dark ground
        for y in range(10, 20):
            if c.get(x, y) == "nila_tua" and c.get(x, y - 1) == "malam":
                c.set(x, y, "kabut")
    c.dots([(14, 17), (18, 16), (22, 18), (12, 21)], "nila")             # bristles
    return c


def jenglot():
    c = Canvas(32, 32)
    c.poly([(12, 7), (19, 7), (22, 27), (9, 27)], "nila_tua")            # long hair
    c.rect(14, 15, 4, 9, "sogan")                                        # thin body
    c.rect(14, 24, 1, 5, "sogan")
    c.rect(17, 24, 1, 5, "sogan")
    c.ellipse(15, 11, 3, 4, "sogan")                                     # head
    c.line(14, 17, 8, 20, "sogan")                                       # arm
    c.outline()
    c.dots([(7, 20), (6, 21), (6, 22), (7, 22), (5, 23)], "perak")       # long nails
    c.dots([(14, 10), (16, 10)], "merah_gerhana")
    c.dots([(14, 13), (16, 13)], "putih_kafan")                          # fangs
    c.dots([(15, 17), (15, 20)], "sogan_tua")                            # ribs
    return c


def genderuwo():
    """Elite, 48x48: hairy giant."""
    c = Canvas(48, 48)
    c.rect(18, 38, 6, 7, "sogan_tua")                                    # legs
    c.rect(29, 38, 6, 7, "sogan_tua")
    c.ellipse(26, 28, 14, 13, "sogan_tua")                               # body
    c.ellipse(20, 14, 9, 8, "sogan_tua")                                 # head
    c.ellipse(9, 31, 5, 10, "sogan_tua")                                 # arm
    c.ellipse(8, 41, 4, 3, "sogan")                                      # fist
    c.outline()
    r = rng(7)
    for _ in range(70):                                                  # fur texture
        x, y = r.randint(8, 40), r.randint(8, 42)
        if c.get(x, y) == "sogan_tua":
            c.set(x, y, "sogan")
    c.rect(13, 11, 12, 2, "malam")                                       # brow
    c.rect(14, 13, 3, 2, "merah_gerhana")                                # eyes
    c.rect(20, 13, 3, 2, "merah_gerhana")
    c.dots([(14, 13), (20, 13)], "api_terang")
    c.rect(14, 18, 9, 3, "malam")                                        # mouth
    c.dots([(15, 18), (21, 18), (17, 20), (19, 20)], "putih_kafan")      # fangs
    return c


def wewe_gombel():
    """Elite, 48x48: hunched old spirit with long white hair."""
    c = Canvas(48, 48)
    c.poly([(20, 6), (33, 9), (38, 40), (22, 42)], "perak")              # hair
    c.ellipse(27, 29, 11, 12, "hutan_tua")                               # hunched body
    c.poly([(18, 34), (36, 34), (38, 45), (16, 45)], "sogan")            # kain
    c.ellipse(19, 14, 6, 6, "kabut")                                     # face
    c.poly([(16, 7), (26, 7), (25, 13), (17, 11)], "putih_kafan")        # hair top
    c.line(20, 26, 8, 30, "hutan_tua", w=2)                              # arm
    c.line(8, 30, 5, 33, "kabut", w=2)
    c.outline()
    c.dots([(4, 34), (4, 35), (6, 35), (6, 36), (8, 34)], "perak")       # claws
    c.dots([(16, 14), (20, 14)], "gaib")
    c.rect(17, 18, 4, 1, "malam")
    c.dots([(30, 22), (26, 25), (32, 28), (21, 38), (28, 40)], "lumut")  # kebaya pattern
    return c


def banaspati(phase=1):
    """Boss, 64x64: living flame with a face. Phase 2 burns hotter."""
    outer, mid, inner, core = (
        ("merah_gerhana", "api", "api_terang", "prada_terang") if phase == 1
        else ("api", "api_terang", "prada_terang", "putih_kafan")
    )
    c = Canvas(64, 64)
    c.poly([(8, 58), (6, 34), (12, 22), (14, 30), (18, 12), (24, 24), (30, 2), (36, 20), (42, 8),
            (46, 26), (52, 16), (56, 34), (56, 58), (32, 62)], outer)
    c.poly([(14, 56), (13, 38), (19, 26), (22, 32), (30, 14), (35, 30), (42, 20), (46, 36), (49, 56), (32, 60)], mid)
    c.ellipse(31, 44, 13, 13, inner)
    c.outline("darah")
    c.ellipse(24, 40, 5, 5, "malam")                                     # eye sockets
    c.ellipse(39, 40, 5, 5, "malam")
    c.ellipse(24, 42, 2, 2, core)
    c.ellipse(39, 42, 2, 2, core)
    c.poly([(16, 32), (30, 38), (30, 41), (16, 37)], mid)                # angry brows cut the sockets
    c.poly([(48, 32), (34, 38), (34, 41), (48, 37)], mid)
    c.line(17, 33, 29, 38, "malam")
    c.line(47, 33, 35, 38, "malam")
    c.poly([(20, 50), (44, 50), (40, 56), (24, 56)], "malam")            # grin
    for x in range(22, 43, 4):
        c.poly([(x, 50), (x + 3, 50), (x + 1.5, 53)], core)              # flame teeth
    r = rng(phase)
    for _ in range(14):                                                  # embers
        x, y = r.randint(2, 61), r.randint(2, 30)
        if c.get(x, y) is None:
            c.set(x, y, inner)
    return c


HEROES = {"pendekar": pendekar, "dalang": dalang}
ENEMIES = {
    "tuyul": tuyul, "kuntilanak": kuntilanak, "pocong": pocong, "babi_ngepet": babi_ngepet,
    "jenglot": jenglot, "genderuwo": genderuwo, "wewe_gombel": wewe_gombel,
    "banaspati": banaspati, "banaspati_fase2": lambda: banaspati(2),
}
