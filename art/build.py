"""Build every Gerhana art asset into out/. Usage: python3 build.py"""
import json
import os

from characters import ENEMIES, HEROES
import font
import music
from icons import CARD_ART, CARD_TYPES, MAP_NODES, UI_ICONS, card_back, card_frame, eclipse_frames
from px import PALETTE, Canvas, animate, sheet
from scenes import arena_banaspati, bar, button, hutan_larangan, mockup, panel, peta, title_screen

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
manifest = []


def save(group, name, canvas, note="", frames=1):
    folder = os.path.join(OUT, group)
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, f"{name}.png")
    canvas.save(path)
    manifest.append({"group": group, "name": name, "file": f"{group}/{name}.png",
                     "w": canvas.w, "h": canvas.h, "frames": frames, "note": note})


def build():
    stills = {}
    for group, table, facing in (("heroes", HEROES, 1), ("enemies", ENEMIES, -1)):
        for name, make in table.items():
            still = make()
            stills[name] = still
            save(group, name, still, f"{still.w}x{still.h} still")
            for anim, frames in animate(still, facing).items():
                fw = frames[0].w
                save(group, f"{name}_{anim}", sheet(frames), f"{len(frames)} frames, {fw}x{still.h} each", len(frames))

    cards = {}
    for kind in CARD_TYPES:
        cards[kind] = card_frame(kind)
        save("cards", f"kartu_{kind}", cards[kind], "60x80, art at (18,7), text panel at (6,38) 48x36")
        save("cards", f"kartu_{kind}_plus", card_frame(kind, upgraded=True), "upgraded frame")
    save("cards", "kartu_belakang", card_back(), "card back")
    art = {name: Canvas(24, 24) for name in CARD_ART}
    for name, draw in CARD_ART.items():
        draw(art[name])
        save("card_art", name, art[name], "24x24, centre in the art window")

    icons = {}
    for name, draw in UI_ICONS.items():
        icons[name] = Canvas(12, 12)
        draw(icons[name])
        save("icons", name, icons[name], "12x12")
    for name, draw in MAP_NODES.items():
        node = Canvas(16, 16)
        draw(node)
        save("map", f"node_{name}", node, "16x16")
    ecl = eclipse_frames()
    save("ui", "timer_gerhana", sheet(ecl), "8 frames, 24x24 each; frame = elapsed share of the 30 s turn", len(ecl))

    save("ui", "panel", panel(), "9-slice, margins 6px")
    for state in ("normal", "hover", "pressed", "disabled"):
        save("ui", f"tombol_{state}", button(state), "9-slice, margins 3px")
    for kind in ("frame", "hp", "perisai", "wayang"):
        save("ui", f"bar_{kind}", bar(kind), "frame 36x9; fills 34x7, scale x to value")

    save("backgrounds", "hutan_larangan", hutan_larangan(), "320x180, ground line y=112")
    save("backgrounds", "arena_banaspati", arena_banaspati(), "320x180, ground line y=112")
    save("backgrounds", "peta", peta(), "320x180")
    for mood in ("menu", "won", "lost"):
        save("backgrounds", f"layar_{mood}", title_screen(mood), "320x180 title/end backdrop")

    n = font.build(os.path.join(OUT, "font"))
    manifest.append({"group": "font", "name": "aksara_malam", "file": "font/aksara_malam.png", "w": 0, "h": 0, "frames": 1, "note": f"{n} glyphs, BMFont"})

    tracks = music.build(os.path.join(OUT, "audio"))
    manifest.append({"group": "audio", "name": "musik", "file": "audio/musik_peta.mp3", "w": 0, "h": 0, "frames": 1, "note": f"{tracks} MP3 loops"})

    save("mockup", "combat", mockup(stills, icons, cards, art, ecl), "composition check, not a game asset")

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump({"palette": PALETTE, "assets": manifest}, f, indent=1)

    # self-check: every sheet divides evenly into its frames, and nothing is empty
    for a in manifest:
        assert a["w"] % a["frames"] == 0, a
    assert all(any(p for row in s.px for p in row) for s in stills.values())
    print(f"ok: {len(manifest)} files in {OUT}")


if __name__ == "__main__":
    build()
