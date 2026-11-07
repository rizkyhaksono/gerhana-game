# Gerhana

Co-op deckbuilder for two players, set in Nusantara folklore. Design: `docs/superpowers/specs/2026-11-06-gerhana-mvp-design.md`.

## Play

1. Start the server (Bun) and keep that terminal open:

   ```bash
   bun packages/server/src/server.ts
   ```

   It listens on `ws://127.0.0.1:8787`. Set `PORT` or `HOST` to change that.

2. Open `client/project.godot` in Godot 4.7 and press F5.

3. Choose a mode:
   - **Main bersama bot:** play alone; the bot plays the Dalang and follows your map choices.
   - **Buat room untuk teman / Gabung dengan kode:** two players. The second player types the 6-letter code. For two windows on one machine, run Godot twice.

**A run:** 7 map steps, then Banaspati. At each step both players vote a path: fight, elite, rest or shop. After fights you pick a reward card; elites also give a Pusaka.

**Combat controls:**
- Click a card to pick it. Serang asks for an enemy, Bantu asks for a hero, and Tahan targets yourself.
- Click a picked card again to drop it.
- Press **Siap** when 2 cards are picked.
- The moon at the top is the 30-second turn timer. When it turns red, the server plays your first two cards.
- Hover a card for its full rules.

**Smoke test without clicking:**

```bash
GERHANA_AUTOPLAY=1 GERHANA_SHOTS=/tmp/gerhana-shots godot --path client
```

This plays a full bot run in real time, saves one screenshot per screen and quits.

## Layout

| Folder | What |
|---|---|
| `packages/rules` | Game rules, pure TypeScript, deterministic (`bun test`) |
| `packages/server` | WebSocket rooms on top of the rules |
| `client` | Godot 4 client. `assets` links to `art/out` |
| `art` | Python generator for every sprite, icon and background |
| `docs` | GDD and implementation plans |

## Tests

```bash
bun test
```
