# Gerhana art

All visual assets for the MVP are generated from code: `python3 build.py` writes 94 PNGs to `out/` plus `out/manifest.json`. Python 3 stdlib only.

Open `gallery.html` through a local server (not `file://`) to see every asset, animated:

```bash
cd art && python3 -m http.server 8765
```

Then open http://localhost:8765/gallery.html.

## Files

| File | Role |
|---|---|
| `px.py` | Palette, canvas, shapes, auto-outline, PNG writer, idle/attack/hit animation from one still |
| `characters.py` | 2 heroes, 7 creatures, Banaspati phase 1 and 2 |
| `icons.py` | Card frames and back, card art, UI icons, map nodes, eclipse timer |
| `scenes.py` | Backgrounds, 9-slice panel and buttons, bars, combat mockup |
| `build.py` | Writes everything and checks sheet sizes |

To change a sprite, edit its function and run `build.py` again. To polish by hand, open the PNG in Pixelorama or Aseprite, but hand edits are lost on the next build, so move polished files out of `out/` first.

## Design tokens

- **Base resolution:** 320×180. Scale ×4 for 1280×720 and ×6 for 1920×1080.
- **Palette:** 21 colors in `px.py` (`PALETTE`). Do not add colors outside it.
- **Outline:** `malam` #0f0d1f, 1px, on every sprite. Banaspati uses `darah`.
- **Light:** moonlight from the upper left.
- **Facing:** heroes face right, creatures face left.
- **Font:** Pixelify Sans (SIL Open Font License, Google Fonts). Download the TTF yourself and place it in the Godot project.

## Godot import

1. **Project Settings > Rendering > Textures > Default Texture Filter = Nearest.** Without this, pixel art turns blurry.
2. **Project Settings > Display > Window:** viewport 320×180, stretch mode `viewport`, aspect `keep`.
3. **Character animations:** in `AnimatedSprite2D` > SpriteFrames, use "Add frames from sprite sheet".

   | Size | Frame size |
   |---|---|
   | 32 px sprites | 48×32 |
   | 48 px elites | 64×48 |
   | Banaspati | 80×64 |

   Idle has 2 frames, attack 4, hit 2. Every frame keeps the sprite at x = 8, so set `centered = false` and the animations will not jump.
4. **Feet line:** place combatants so their sprite bottom sits 2px below y = 112 on the backgrounds.
5. **9-slice:** use `NinePatchRect`.
   - `ui/panel.png`: patch margins 6.
   - `ui/tombol_*.png`: patch margins 4.
6. **Bars:** `ui/bar_frame.png` with a `TextureProgressBar` using `bar_hp`, `bar_perisai` or `bar_wayang` as the progress texture.
7. **Turn timer:** `ui/timer_gerhana.png` has 8 frames of 24×24. Show frame `floor(elapsed / 30 * 8)`, capped at 7.
8. **Cards:** frame 48×64. Draw the 24×24 art centred in the art window at (5, 14), size 38×25. Write the name in the top banner and the text in the light panel (y 43–58).

## Not included yet

- **Audio** (music and SFX). It must be licensed or commissioned, as the GDD says.
- **Card art for the 30 reward cards.** Their list is designed in M1.
- **10 Pusaka icons.** Same reason.
- **Title logo.**
- **Final pixel polish.** These are generated placeholders at production size. They are good enough to build and playtest with, but a pixel artist pass is still worth it before release.
