# Gerhana

Co-op deckbuilder for two players, set in Nusantara folklore. Design: `docs/superpowers/specs/2026-11-06-gerhana-mvp-design.md`.

## Play the combat slice

1. Start the server (Bun):

   ```bash
   bun packages/server/src/server.ts
   ```

   It listens on `ws://127.0.0.1:8787`. Set `PORT` or `HOST` to change that.

2. Open `client/project.godot` in Godot 4.7 and press F5.

3. Choose a mode:
   - **Main dengan bot:** play alone; the bot plays the Dalang.
   - **Buat room / Gabung:** two players. The second player types the 6-letter code. For two windows on one machine, run Godot twice.

**Controls:**
- Click a card to pick it. Serang asks for an enemy, Bantu asks for a hero, and Tahan targets yourself.
- Click a picked card again to drop it.
- Press **Siap** when you have 2 cards.
- After 30 seconds the server plays your first two cards for you.

**Smoke test without clicking:**

```bash
GERHANA_AUTOPLAY=1 godot --path client
```

This starts a bot game, plays one combat and quits.

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
