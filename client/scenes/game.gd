extends Node2D
## Gerhana client. Talks to packages/server over WebSocket; every rule lives on the server.
## This scene draws the menu, the run screens (map vote, reward, rest, shop, end) and combat,
## collects the player's choices and animates the events the server sends back.

const SERVER_URL := "ws://127.0.0.1:8787"
const GROUND := 112      # feet line inside the background art
const LIFT := 24         # the combat world is drawn this much higher to make room for the hand
const HERO_X := [42, 80]
const CARD_W := 60
const CARD_Y := 102
const STEP := 0.55       # seconds per animated event

const INTENT_ICON := {
	"attack": "niat_serang", "attackStatus": "niat_serang_semua", "status": "niat_status", "steal": "niat_curi",
	"flee": "niat_kabur", "evade": "niat_hindar", "charge": "niat_ancang", "drain": "niat_hisap", "destroyWayang": "niat_culik",
}
const STATUS_ICON := {"rentan": "status_rentan", "lemah": "status_lemah", "terbakar": "status_terbakar"}
const STATUS_NAME := {"rentan": "Rentan", "lemah": "Lemah", "terbakar": "Terbakar"}
const NODE_NAME := {"pertarungan": "Pertarungan", "elite": "Elite", "istirahat": "Istirahat", "warung": "Warung", "boss": "Banaspati"}
const NODE_HINT := {
	"pertarungan": "Lawan makhluk biasa. Hadiah kartu dan koin.",
	"elite": "Lawan kuat. Hadiah kartu, 40 koin, dan Pusaka.",
	"istirahat": "Pulihkan HP atau upgrade satu kartu.",
	"warung": "Beli kartu atau buang kartu lemah.",
}
const ERRORS := {
	"NO_ROOM": "Kode room tidak ditemukan. Periksa lagi kodenya.", "ROOM_FULL": "Room itu sudah berisi dua pemain.",
	"SLOW_DOWN": "Terlalu sering mencoba. Tunggu satu menit.", "WRONG_COUNT": "Pilih tepat 2 kartu.",
	"BAD_TARGET": "Target itu tidak bisa dipilih.", "NOT_ENOUGH_COINS": "Koin tidak cukup.",
	"DECK_TOO_SMALL": "Deck minimal 5 kartu.", "BAD_MESSAGE": "Server tidak mengenali pesan itu.",
}

## Smoke test: GERHANA_AUTOPLAY=1 starts a bot run and plays it alone; GERHANA_SHOTS=<dir> saves a screenshot per screen.
var autoplay := OS.get_environment("GERHANA_AUTOPLAY") == "1"
var shots_dir := OS.get_environment("GERHANA_SHOTS")
var shot_n := 0

var ws := WebSocketPeer.new()
var first_msg := {}
var was_open := false
var inbox: Array = []
var busy := false

var you := 0
var run := {}                # RunView
var state := {}              # combat StateView
var hand: Array = []
var picks: Array = []        # [{cardUid, target}]
var pending := {}            # card waiting for a target
var sent := false
var turn := 0
var turn_ms := 30000
var turn_started := 0

var root: Control            # everything that is not the combat world
var world: Node2D
var actors := {}             # "p0" / "e1" -> {node, rect, fill, hp, intent, chips}
var hand_box: Control
var prompt: Label
var ready_button: Button
var picked_label: Label
var timer_sprite: Sprite2D
var coin_label: Label
var status_line: Label


func _ready() -> void:
	_show_menu()
	await _shot()
	if autoplay:
		_connect_and_send({"type": "create_room", "name": "Auto", "bot": true})


func _process(_dt: float) -> void:
	ws.poll()
	var st := ws.get_ready_state()
	if st == WebSocketPeer.STATE_OPEN:
		if not was_open:
			was_open = true
			_send(first_msg)
		while ws.get_available_packet_count() > 0:
			var m = JSON.parse_string(ws.get_packet().get_string_from_utf8())
			if m is Dictionary:
				inbox.append(m)
		if not busy and not inbox.is_empty():
			_pump()
	elif st == WebSocketPeer.STATE_CLOSED and was_open:
		was_open = false
		_show_menu("Koneksi ke server terputus. Pastikan server menyala, lalu coba lagi.")
	if timer_sprite and turn_ms > 0:
		var t := float(Time.get_ticks_msec() - turn_started) / turn_ms
		timer_sprite.frame = clampi(int(t * 8), 0, 7)


# --- network -----------------------------------------------------------------------

func _connect_and_send(msg: Dictionary) -> void:
	ws = WebSocketPeer.new()
	was_open = false
	first_msg = msg
	if ws.connect_to_url(SERVER_URL) != OK:
		_status("Alamat server tidak valid.")
		return
	_status("Menghubungkan ke server…")
	await get_tree().create_timer(5.0).timeout
	if not was_open and world == null and ws.get_ready_state() != WebSocketPeer.STATE_OPEN:
		ws.close()
		_status("Server tidak menjawab. Jalankan: bun packages/server/src/server.ts")


func _send(msg: Dictionary) -> void:
	ws.send_text(JSON.stringify(msg))


func _pump() -> void:
	busy = true
	while not inbox.is_empty():
		await _handle(inbox.pop_front())
	busy = false


func _handle(m: Dictionary) -> void:
	match m.type:
		"room_state":
			you = int(m.you)
			if m.names[1] == null:
				_status("Kode room: %s. Bagikan ke temanmu, lalu tunggu dia bergabung." % m.code)
		"run_state":
			run = m.run
			if run.phase.kind != "combat":
				_show_run()
				await _shot()
				if autoplay:
					_autoplay_run()
		"turn_start":
			state = m.state  # before _show_combat: it picks the arena from the enemies
			if world == null:
				_show_combat()
			hand = m.hand
			turn = int(m.turn)
			turn_ms = int(m.turnMs)
			turn_started = Time.get_ticks_msec()
			picks.clear()
			pending = {}
			sent = false
			_render_state()
			_render_hand()
			if state.players[you].pingsan:
				sent = true
				_send({"type": "play_cards", "picks": [], "turn": turn})
				_prompt("Kamu pingsan. Rekanmu bertarung sendiri giliran ini.")
			else:
				_prompt("Pilih 2 kartu.")
				if autoplay:
					_autoplay_turn()
			if state.turn == 1:
				await _shot()
		"partner_ready":
			if int(m.player) != you and not sent:
				_prompt("Rekan sudah siap. Pilih 2 kartu.")
		"turn_resolved":
			_clear_hand()
			_prompt("")
			await _animate(m.events)
			if m.state != null:
				state = m.state
				_render_state()
		"combat_end":
			await _banner(m.outcome == "won")
		"error":
			if m.code == "STALE_TURN":
				return  # our picks arrived after the timer played for us; the new turn is already on screen
			var text: String = ERRORS.get(m.code, "Server menolak aksi itu (%s)." % m.code)
			if world:
				_prompt(text)
				if sent and m.code in ["WRONG_COUNT", "BAD_TARGET", "NOT_IN_HAND", "DUPLICATE"]:
					sent = false
					_render_hand()
			else:
				_status(text)


# --- shared layout -------------------------------------------------------------------

func _clear_all() -> void:
	for c in get_children():
		c.queue_free()
	root = null
	world = null
	timer_sprite = null
	status_line = null
	prompt = null
	ready_button = null
	actors.clear()


func _new_root(backdrop: String) -> void:
	_clear_all()
	add_child(Art.sprite("backgrounds/" + backdrop, Vector2.ZERO))
	root = Control.new()
	root.theme = Art.theme()
	root.size = Vector2(320, 180)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)


func _add(node: Control) -> Control:
	root.add_child(node)
	return node


func _status(text: String) -> void:
	if status_line:
		status_line.text = text


func _title(text: String, y := 8) -> void:
	_add(Art.label(text, Vector2(0, y), 320, Art.PRADA, Art.TEXT * 2, HORIZONTAL_ALIGNMENT_CENTER, Art.DARAH))


## The two pendekar at the bottom of every run screen: who you are, HP, coins, deck, pusaka.
func _party() -> void:
	var line := ColorRect.new()
	line.color = Art.PRADA
	line.position = Vector2(8, 150)
	line.size = Vector2(304, 1)
	_add(line)
	for i in run.players.size():
		var p: Dictionary = run.players[i]
		var x: int = 10 + i * 156
		var name := "%s%s" % [p.character.capitalize(), " (kamu)" if i == you else ""]
		_add(Art.label(name, Vector2(x, 154), 150, Art.PRADA if i == you else Art.PUTIH))
		_add(Art.label("HP %d/%d   %d koin   %d kartu" % [p.hp, p.maxHp, p.coins, p.deckSize], Vector2(x, 164), 150, Art.PERAK))
		if not p.pusaka.is_empty():
			var names: Array = p.pusaka.map(func(x): return x.name)
			_add(Art.label(", ".join(names), Vector2(x, 173), 150, Art.KABUT, Art.TEXT, HORIZONTAL_ALIGNMENT_LEFT, Color.TRANSPARENT))


# --- menu ----------------------------------------------------------------------------

func _show_menu(message := "") -> void:
	_new_root("layar_menu")
	_add(Art.label("Gerhana", Vector2(0, 70), 320, Art.PRADA, Art.TEXT * 3, HORIZONTAL_ALIGNMENT_CENTER, Art.DARAH))
	_add(Art.label("Dua pendekar, satu malam. Hentikan gerhana sebelum fajar.", Vector2(0, 100), 320, Art.PERAK, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	_menu_list([
		["Main bersama bot", func(): _connect_and_send({"type": "create_room", "name": "Pemain", "bot": true})],
		["Buat room untuk teman", func(): _connect_and_send({"type": "create_room", "name": "Pemain"})],
		["Gabung dengan kode", _show_join],
	])
	status_line = _add(Art.label(message, Vector2(0, 166), 320, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))


## Vertical list of text buttons with a ▸ cursor that follows hover and keyboard focus.
func _menu_list(items: Array) -> void:
	var cursor := _add(Art.label("▸", Vector2(104, 0), 8, Art.PRADA))
	var first: Button
	for i in items.size():
		var b := Art.text_button(items[i][0], Vector2(114, 118 + i * 13), 110, items[i][1])
		var y := 118 + i * 13 + 1
		b.mouse_entered.connect(func(): b.grab_focus())
		b.focus_entered.connect(func(): cursor.position.y = y)
		_add(b)
		if i == 0:
			first = b
			cursor.position.y = y
	first.grab_focus.call_deferred()


func _show_join() -> void:
	_new_root("layar_menu")
	_title("Gabung room", 70)
	_add(Art.label("Ketik kode 6 huruf dari temanmu.", Vector2(0, 92), 320, Art.PERAK, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	var code := LineEdit.new()
	code.theme = Art.theme()
	code.placeholder_text = "Kode"
	code.max_length = 6
	code.alignment = HORIZONTAL_ALIGNMENT_CENTER
	code.position = Vector2(118, 108)
	code.custom_minimum_size = Vector2(84, 16)
	_add(code)
	var join := func(): _connect_and_send({"type": "join_room", "code": code.text.strip_edges(), "name": "Pemain"})
	code.text_submitted.connect(func(_t): join.call())
	_add(Art.button("Gabung", Vector2(118, 130), Vector2(40, 16), join))
	_add(Art.button("Kembali", Vector2(162, 130), Vector2(40, 16), func(): _show_menu()))
	status_line = _add(Art.label("", Vector2(0, 166), 320, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	code.grab_focus.call_deferred()


# --- run screens -------------------------------------------------------------------------

func _show_run() -> void:
	var kind: String = run.phase.kind
	if kind == "ended":
		_show_ended()
		return
	_new_root("peta")
	var dim := ColorRect.new()  # quiet the batik so text and icons read first
	dim.color = Color(Art.MALAM, 0.6)
	dim.size = Vector2(320, 180)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add(dim)
	status_line = _add(Art.label("", Vector2(0, 138), 320, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	match kind:
		"vote": _show_vote()
		"reward": _show_reward()
		"rest": _show_rest()
		"shop": _show_shop()
	_party()


func _show_vote() -> void:
	var ph: Dictionary = run.phase
	var step := int(ph.step)
	var total := int(run.steps) + 1
	_title("Langkah %d dari %d" % [step + 1, total])
	# the night's path: past steps fade, the boss waits at the end
	for i in total:
		var x: int = 22 + i * 38
		var kinds: Array = run.map[i] if i < int(run.steps) else ["boss"]
		for j in kinds.size():
			var icon := TextureRect.new()
			icon.texture = Art.tex("map/node_" + kinds[j])
			icon.position = Vector2(x, 32 + j * 20 if kinds.size() == 2 else 42)
			icon.modulate.a = 0.25 if i < step else (1.0 if i == step else 0.55)
			_add(icon)
		if i == step:
			var bracket := ColorRect.new()
			bracket.color = Art.GAIB
			bracket.position = Vector2(x - 2, 72)
			bracket.size = Vector2(20, 1)
			_add(bracket)
	var mine = ph.votes[you]
	var theirs = ph.votes[1 - you]
	for j in 2:
		var kind: String = ph.options[j]
		var x: int = 34 + j * 132
		var b := Art.button("", Vector2(x, 80), Vector2(120, 34), func(): _send({"type": "vote", "choice": j}))
		b.disabled = mine != null
		_add(b)
		var icon := TextureRect.new()
		icon.texture = Art.tex("map/node_" + kind)
		icon.position = Vector2(6, 9)
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(icon)
		b.add_child(Art.label(NODE_NAME[kind], Vector2(26, 5), 90, Art.PRADA if mine == null or int(mine) == j else Art.KABUT))
		b.add_child(Art.label(_who_voted(ph.votes, j), Vector2(26, 17), 90, Art.GAIB))
		b.tooltip_text = NODE_HINT[kind]
	var note := "Pilih jalan. Kalau kalian beda pilihan, koin yang memutuskan."
	if mine == null and theirs != null:
		note = "Rekan memilih %s." % NODE_NAME[ph.options[int(theirs)]]
	elif mine != null and theirs == null:
		note = "Menunggu pilihan rekan…"
	_add(Art.label(note, Vector2(0, 120), 320, Art.PERAK, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))


func _who_voted(votes: Array, j: int) -> String:
	var who := []
	for i in 2:
		if votes[i] != null and int(votes[i]) == j:
			who.append("kamu" if i == you else "rekan")
	return " + ".join(who)


func _show_reward() -> void:
	var ph: Dictionary = run.phase
	_title("Hadiah")
	if not ph.done[you]:
		for i in ph.offers.size():
			var c: Dictionary = ph.offers[i]
			_add(_card(c, Vector2(62 + i * 66, 30), func(): _send({"type": "choose_card", "defId": c.defId})))
		_add(Art.button("Lewati", Vector2(262, 62), Vector2(48, 16), func(): _send({"type": "choose_card", "defId": null})))
	else:
		_status("Menunggu rekan memilih…")
	if ph.pusakaOffer != null:
		if int(ph.pusakaChooser) == you:
			_status("Pusaka dari elite. Pilih satu:")
			for i in ph.pusakaOffer.size():
				var x: Dictionary = ph.pusakaOffer[i]
				var b := Art.button(x.name, Vector2(6 + i * 104, 124), Vector2(100, 14), func(): _send({"type": "choose_pusaka", "id": x.id}))
				b.tooltip_text = x.text
				_add(b)
			status_line.position.y = 113
		else:
			_status("Rekan sedang memilih Pusaka.")


func _show_rest() -> void:
	var ph: Dictionary = run.phase
	_title("Istirahat di pondok")
	if ph.done[you]:
		_status("Menunggu rekan…")
		return
	var me: Dictionary = run.players[you]
	_add(Art.label("Api unggun menyala. Pilih satu.", Vector2(0, 40), 320, Art.PERAK, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	_add(Art.button("Pulihkan %d HP" % floori(me.maxHp * 0.3), Vector2(64, 64), Vector2(92, 20), func(): _send({"type": "rest", "choice": "heal"})))
	_add(Art.button("Upgrade 1 kartu", Vector2(164, 64), Vector2(92, 20), func(): _deck_picker("upgrade")))


func _show_shop() -> void:
	var ph: Dictionary = run.phase
	var coins := int(run.players[you].coins)
	_title("Warung")
	if ph.done[you]:
		_status("Menunggu rekan…")
		return
	_add(Art.label("Kamu punya %d koin." % coins, Vector2(0, 24), 320, Art.PRADA, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	for i in ph.offers.size():
		var c: Dictionary = ph.offers[i]
		var b := _card(c, Vector2(62 + i * 66, 36), func(): _send({"type": "shop_buy", "defId": c.defId}))
		if coins < int(ph.cardPrice):
			b.disabled = true
			b.modulate = Color(0.55, 0.55, 0.65)
		_add(b)
		_add(Art.label("%d koin" % int(ph.cardPrice), Vector2(62 + i * 66, 117), CARD_W, Art.PRADA, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	var rm := Art.button("Buang kartu: %d koin" % int(ph.removePrice), Vector2(52, 130), Vector2(104, 16), func(): _deck_picker("remove"))
	rm.disabled = coins < int(ph.removePrice) or ph.removed
	if ph.removed:
		rm.text = "Sudah buang kartu"
	_add(rm)
	_add(Art.button("Selesai belanja", Vector2(164, 130), Vector2(104, 16), func(): _send({"type": "leave"})))
	status_line.position.y = 26
	status_line.text = ""


func _deck_picker(action: String) -> void:
	var panel := NinePatchRect.new()
	panel.texture = Art.tex("ui/panel")
	for side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		panel.set_patch_margin(side, 6)
	panel.position = Vector2(8, 6)
	panel.size = Vector2(304, 168)
	_add(panel)
	panel.add_child(Art.label("Kartu mana yang di-upgrade?" if action == "upgrade" else "Kartu mana yang dibuang?", Vector2(0, 7), 304, Art.PRADA, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	var cards: Array = run.deck.filter(func(c): return action != "upgrade" or not c.upgraded)
	for i in cards.size():
		var c: Dictionary = cards[i]
		var b := Art.text_button("%s  %s" % [c.name, c.text], Vector2(12 + (i % 2) * 144, 20 + (i / 2) * 11), 140, func():
			_send({"type": "rest", "choice": {"upgrade": c.uid}} if action == "upgrade" else {"type": "shop_remove", "cardUid": c.uid})
			panel.queue_free())
		b.clip_text = true
		panel.add_child(b)
	panel.add_child(Art.button("Batal", Vector2(130, 148), Vector2(44, 14), panel.queue_free))


func _show_ended() -> void:
	var ph: Dictionary = run.phase
	var won: bool = ph.result == "won"
	_new_root("layar_won" if won else "layar_lost")
	_add(Art.label("Gerhana dicegah" if won else "Gerhana sempurna", Vector2(0, 74), 320, Art.PRADA if won else Art.MERAH, Art.TEXT * 2, HORIZONTAL_ALIGNMENT_CENTER, Art.MALAM))
	var line := "Banaspati tumbang sebelum fajar. Desa selamat." if won else "Kalian tumbang di langkah %d dari %d." % [int(ph.stepReached), int(run.steps) + 1]
	_add(Art.label(line, Vector2(0, 96), 320, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	_menu_list([
		["Main lagi bersama rekan yang sama", func(): _send({"type": "play_again"})],
		["Kembali ke menu", func():
			ws.close()
			was_open = false
			_show_menu()],
	])
	if autoplay:
		print("AUTOPLAY RUN: ", ph.result, " step=", int(ph.stepReached))


# --- combat ------------------------------------------------------------------------------

func _show_combat() -> void:
	_clear_all()
	world = Node2D.new()
	world.position.y = -LIFT
	add_child(world)
	var boss := false
	for e in state.get("enemies", []):
		boss = boss or e.defId == "banaspati"
	world.add_child(Art.sprite("backgrounds/" + ("arena_banaspati" if boss else "hutan_larangan"), Vector2.ZERO))
	root = Control.new()
	root.theme = Art.theme()
	root.size = Vector2(320, 180)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	# top bar: prompt on the left, the eclipse timer in the middle, coins on the right
	var bar := ColorRect.new()
	bar.color = Color(Art.MALAM, 0.85)
	bar.size = Vector2(320, 13)
	_add(bar)
	timer_sprite = Art.sprite("ui/timer_gerhana", Vector2(148, 1))
	timer_sprite.hframes = 8
	add_child(timer_sprite)
	prompt = _add(Art.label("", Vector2(6, 2), 138, Art.PUTIH))
	coin_label = _add(Art.label("", Vector2(176, 2), 138, Art.PRADA, Art.TEXT, HORIZONTAL_ALIGNMENT_RIGHT))
	hand_box = Control.new()
	hand_box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add(hand_box)
	picked_label = _add(Art.label("", Vector2(264, 130), 52, Art.PERAK, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))
	ready_button = Art.button("Siap", Vector2(266, 144), Vector2(48, 20), _submit)
	_add(ready_button)


func _prompt(text: String) -> void:
	if prompt:
		prompt.text = text


func _render_state() -> void:
	if coin_label:
		coin_label.text = "%d koin" % int(state.players[you].coins)
	var keys := []
	for p in state.players:
		keys.append("p%d" % int(p.id))
	for e in state.enemies:
		keys.append(e.uid)
	if keys != actors.keys():
		_build_actors()
	for p in state.players:
		var a: Dictionary = actors["p%d" % int(p.id)]
		_bar(a, p.hp, p.maxHp)
		var chips := []
		if p.block > 0:
			chips.append(["perisai", p.block])
		if p.wayang > 0:
			chips.append(["wayang", p.wayang])
		if p.jurusStacks > 0:
			chips.append(["jurus", p.jurusStacks])
		_chips(a, chips + _status_chips(p.statuses))
		a.node.modulate = Color(0.45, 0.45, 0.55) if p.pingsan else Color.WHITE
	for e in state.enemies:
		var a: Dictionary = actors[e.uid]
		var gone: bool = e.hp <= 0 or e.fled
		_bar(a, e.hp, e.maxHp)
		a.bar.visible = not gone
		a.node.modulate.a = 0.0 if gone else 1.0
		_chips(a, [] if gone else _status_chips(e.statuses))
		_intent(a, null if gone else e.intent)


func _status_chips(statuses: Dictionary) -> Array:
	var out := []
	for k in statuses:
		out.append([STATUS_ICON.get(k, "status_lemah"), statuses[k]])
	return out


func _build_actors() -> void:
	for a in actors.values():
		for n in [a.node, a.bar, a.intent, a.chips]:
			n.queue_free()
	actors.clear()
	for p in state.players:
		_add_actor("p%d" % int(p.id), "heroes", p.character, HERO_X[int(p.id)], 1)
	var cursor := 304
	var list: Array = state.enemies.duplicate()
	list.reverse()
	for e in list:
		cursor -= Art.tex("enemies/" + e.defId).get_width()
		_add_actor(e.uid, "enemies", e.defId, cursor, -1)
		cursor -= 6


func _add_actor(key: String, group: String, sprite_name: String, x: int, facing: int) -> void:
	var size := Art.tex(group + "/" + sprite_name).get_size()
	var node := Art.actor(group, sprite_name, x, GROUND)
	world.add_child(node)
	var top := GROUND - size.y + 2 - LIFT
	var feet := GROUND + 2 - LIFT
	var bar := Control.new()
	bar.position = Vector2(x + size.x / 2 - 18, feet + 1)
	bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var frame := TextureRect.new()
	frame.texture = Art.tex("ui/bar_frame")
	bar.add_child(frame)
	var fill := TextureProgressBar.new()
	fill.texture_progress = Art.tex("ui/bar_hp")
	fill.position = Vector2(1, 1)
	fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bar.add_child(fill)
	var hp := Art.label("", Vector2(0, 0), 36, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	bar.add_child(hp)
	_add(bar)
	var intent := Control.new()
	intent.position = Vector2(clampf(x + size.x / 2, 38, 282), maxf(top - 14, 16))
	intent.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add(intent)
	var chips := Control.new()  # status / shield chips beside the sprite, on the side away from the enemy
	chips.position = Vector2(x - 14 if facing < 0 else x + size.x + 2, top + 4)
	chips.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_add(chips)
	actors[key] = {"node": node, "rect": Rect2(x, top, size.x, size.y), "bar": bar, "fill": fill, "hp": hp, "intent": intent, "chips": chips}


func _bar(a: Dictionary, hp: float, max_hp: float) -> void:
	a.fill.max_value = max_hp
	a.fill.value = hp
	a.hp.text = "%d/%d" % [hp, max_hp]


func _chips(a: Dictionary, chips: Array) -> void:
	for c in a.chips.get_children():
		c.queue_free()
	for i in chips.size():
		var icon := TextureRect.new()
		icon.texture = Art.tex("icons/" + chips[i][0])
		icon.position = Vector2(0, i * 11)
		a.chips.add_child(icon)
		a.chips.add_child(Art.label("%d" % chips[i][1], Vector2(1, i * 11 + 3), 12, Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))


func _intent(a: Dictionary, intent) -> void:
	for c in a.intent.get_children():
		c.queue_free()
	if intent == null:
		return
	var icon := TextureRect.new()
	icon.texture = Art.tex("icons/" + INTENT_ICON.get(intent.kind, "niat_status"))
	icon.position = Vector2(-6, 0)
	a.intent.add_child(icon)
	var who := ""
	for t in intent.targets:
		who += "P" if state.players[int(t)].character == "pendekar" else "D"
	var text := "%d" % intent.amount if intent.amount > 0 else ""
	if intent.has("coins"):
		text = "%s%scuri %d" % [text, " " if text else "", intent.coins]
	if intent.has("status"):
		text = "%s%s%s %d" % [text, " " if text else "", STATUS_NAME.get(intent.status, intent.status), intent.stacks]
	if who:
		text += "→" + who
	a.intent.add_child(Art.label(text, Vector2(-36, -9), 72, Art.MERAH if intent.amount > 0 else Art.PUTIH, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER))


# --- hand and picks ------------------------------------------------------------------------

func _clear_hand() -> void:
	if hand_box:
		for c in hand_box.get_children():
			c.queue_free()
	if ready_button:
		ready_button.disabled = true
	if picked_label:
		picked_label.text = ""


func _render_hand() -> void:
	_clear_hand()
	var x0 := 6 + (4 - hand.size()) * 32
	for i in hand.size():
		var c: Dictionary = hand[i]
		var order := _pick_index(c.uid)
		var base := Vector2(x0 + i * 64, CARD_Y - (8 if order >= 0 else 0))
		var btn := _card(c, base, _on_card.bind(i), "%d" % (order + 1) if order >= 0 else "")
		if order >= 0 or (not pending.is_empty() and pending.uid == c.uid):
			_outline(btn, Art.GAIB if order >= 0 else Art.PRADA)
		if order < 0 and not sent:  # hover lifts the card a little: it answers the pointer
			btn.mouse_entered.connect(func(): create_tween().tween_property(btn, "position:y", base.y - 4, 0.08))
			btn.mouse_exited.connect(func(): create_tween().tween_property(btn, "position:y", base.y, 0.08))
		hand_box.add_child(btn)
	ready_button.disabled = sent or picks.size() != _required()
	picked_label.text = "" if sent else "%d/%d kartu" % [picks.size(), _required()]


func _outline(btn: Control, color: Color) -> void:
	for r in [Rect2(-1, -1, CARD_W + 2, 1), Rect2(-1, 80, CARD_W + 2, 1), Rect2(-1, 0, 1, 80), Rect2(CARD_W, 0, 1, 80)]:
		var line := ColorRect.new()
		line.color = color
		line.position = r.position
		line.size = r.size
		line.mouse_filter = Control.MOUSE_FILTER_IGNORE
		btn.add_child(line)


## A clickable 60x80 card: frame by type, art, then name and rules text on the lontar panel.
func _card(c: Dictionary, pos: Vector2, on_press: Callable, badge := "") -> Button:
	var btn := Button.new()
	btn.flat = true
	btn.focus_mode = Control.FOCUS_NONE
	btn.position = pos
	btn.custom_minimum_size = Vector2(CARD_W, 80)
	var tag_text := ""
	if "jurus" in c.get("tags", []):
		tag_text += "\nJurus: makin kuat tiap giliran berturut-turut memainkan Jurus."
	if "serempak" in c.get("tags", []):
		tag_text += "\nBareng: bonus kalau rekan menyerang musuh yang sama."
	btn.tooltip_text = "%s: %s%s" % [c.name, c.text, tag_text]
	btn.pressed.connect(on_press)
	btn.clip_contents = true
	for state_name in ["normal", "hover", "pressed", "focus", "disabled"]:
		btn.add_theme_stylebox_override(state_name, StyleBoxEmpty.new())
	var frame := TextureRect.new()
	frame.texture = Art.tex("cards/kartu_%s%s" % [c.type, "_plus" if c.upgraded else ""])
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(frame)
	var art_path := "res://assets/card_art/%s.png" % _art_id(c.defId)
	var art := TextureRect.new()
	if ResourceLoader.exists(art_path):
		art.texture = load(art_path)
	else:  # reward cards have no art yet: show the card type's starter art, dimmed
		art.texture = Art.tex("card_art/" + {"serang": "tebas", "tahan": "tangkis", "bantu": "restu"}[c.type])
		art.modulate.a = 0.45
	art.position = Vector2(18, 6)
	art.mouse_filter = Control.MOUSE_FILTER_IGNORE
	btn.add_child(art)
	var tags: Array = c.get("tags", [])
	for i in tags.size():  # Jurus / Serempak as icons in the art window corner
		var tag := TextureRect.new()
		tag.texture = Art.tex("icons/" + ("jurus" if tags[i] == "jurus" else "niat_serang_semua"))
		tag.position = Vector2(5, 5 + i * 13)
		tag.mouse_filter = Control.MOUSE_FILTER_IGNORE
		btn.add_child(tag)
	var box := VBoxContainer.new()
	box.position = Vector2(6, 35)
	box.custom_minimum_size = Vector2(48, 39)
	box.add_theme_constant_override("separation", 1)
	box.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for t in [[c.name + ("+" if c.upgraded else ""), Art.DARAH], [c.text, Art.MALAM]]:
		var l := Art.label(t[0], Vector2.ZERO, 48, t[1], Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER, Color.TRANSPARENT)
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(l)
	btn.add_child(box)
	if badge:
		var dot := ColorRect.new()
		dot.color = Art.GAIB
		dot.position = Vector2(48, 2)
		dot.size = Vector2(10, 11)
		dot.mouse_filter = Control.MOUSE_FILTER_IGNORE
		btn.add_child(dot)
		btn.add_child(Art.label(badge, Vector2(48, 3), 10, Art.MALAM, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER, Color.TRANSPARENT))
	return btn


func _art_id(def_id: String) -> String:
	return "tangkis" if def_id.begins_with("tangkis") else def_id


func _required() -> int:
	return mini(2, hand.size())


func _pick_index(uid: String) -> int:
	for i in picks.size():
		if picks[i].cardUid == uid:
			return i
	return -1


func _on_card(i: int) -> void:
	if sent:
		return
	var c: Dictionary = hand[i]
	var existing := _pick_index(c.uid)
	if existing >= 0:
		picks.remove_at(existing)
	elif not pending.is_empty() and pending.uid == c.uid:
		pending = {}
	elif picks.size() < _required():
		match c.type:
			"tahan":
				picks.append({"cardUid": c.uid, "target": {"kind": "player", "id": you}})
			"serang":
				var alive := _living_enemies()
				if alive.size() == 1:
					picks.append({"cardUid": c.uid, "target": {"kind": "enemy", "uid": alive[0]}})
				else:
					pending = c
			"bantu":
				pending = c
	if not pending.is_empty():
		_prompt("Klik musuh untuk %s." % pending.name if pending.type == "serang" else "Klik pendekar untuk %s." % pending.name)
	else:
		_prompt("Tekan Siap." if picks.size() == _required() else "Pilih 2 kartu.")
	_render_hand()


func _living_enemies() -> Array:
	var out := []
	for e in state.enemies:
		if e.hp > 0 and not e.fled:
			out.append(e.uid)
	return out


func _unhandled_input(event: InputEvent) -> void:
	if pending.is_empty() or not (event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT):
		return
	var pos := get_global_mouse_position()
	for key in actors:
		if not actors[key].rect.grow(3).has_point(pos):
			continue
		if pending.type == "serang" and key in _living_enemies():
			picks.append({"cardUid": pending.uid, "target": {"kind": "enemy", "uid": key}})
		elif pending.type == "bantu" and key.begins_with("p") and not state.players[int(key.substr(1))].pingsan:
			picks.append({"cardUid": pending.uid, "target": {"kind": "player", "id": int(key.substr(1))}})
		else:
			continue
		pending = {}
		_prompt("Tekan Siap." if picks.size() == _required() else "Pilih 2 kartu.")
		_render_hand()
		return


func _submit() -> void:
	if sent or picks.size() != _required():
		return
	sent = true
	_send({"type": "play_cards", "picks": picks, "turn": turn})
	_prompt("Menunggu rekan…")
	_render_hand()


# --- events --------------------------------------------------------------------------------

func _key(t: Dictionary) -> String:
	return "p%d" % int(t.id) if t.kind == "player" else t.uid


func _animate(events: Array) -> void:
	for e in events:
		match e.t:
			"card":
				var a = actors.get("p%d" % int(e.player))
				if a and e.target.kind == "enemy":
					a.node.play("attack")
				await _wait(STEP * 0.6)
			"damage":
				var a = actors.get(_key(e.to))
				if a:
					a.node.play("hit")
					_float(a, "-%d" % int(e.amount), Art.MERAH)
					a.fill.value = e.hpAfter
					a.hp.text = "%d/%d" % [e.hpAfter, a.fill.max_value]
				await _wait(STEP)
			"block":
				_float(actors.get("p%d" % int(e.player)), "+%d perisai" % int(e.amount), Art.PERAK)
				await _wait(STEP * 0.6)
			"wayang":
				_float(actors.get("p%d" % int(e.player)), "wayang %d" % int(e.hp), Art.PRADA)
				await _wait(STEP * 0.6)
			"status":
				_float(actors.get(_key(e.to)), "%s %d" % [STATUS_NAME.get(e.status, e.status), int(e.stacks)], Art.GAIB)
				await _wait(STEP * 0.6)
			"steal":
				_float(actors.get("p%d" % int(e.player)), "-%d koin" % int(e.amount), Art.PRADA)
				await _wait(STEP)
			"coinsReturned":
				_float(actors.get("p%d" % int(e.player)), "+%d koin" % int(e.amount), Art.PRADA)
				await _wait(STEP * 0.6)
			"flee", "enemyDied":
				var a = actors.get(e.enemy)
				if a:
					_float(a, "Kabur!" if e.t == "flee" else "Tumbang", Art.PUTIH)
					create_tween().tween_property(a.node, "modulate:a", 0.0, STEP)
				await _wait(STEP)
			"pingsan":
				var a = actors.get("p%d" % int(e.player))
				if a:
					_float(a, "Pingsan", Art.MERAH)
					a.node.modulate = Color(0.45, 0.45, 0.55)
				await _wait(STEP)


func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds * (0.3 if autoplay else 1.0)).timeout


func _float(a, text: String, color: Color) -> void:
	if a == null:
		return
	var l := Art.label(text, a.rect.position + Vector2(-12, -2), a.rect.size.x + 24, color, Art.TEXT, HORIZONTAL_ALIGNMENT_CENTER)
	_add(l)
	var tw := create_tween().set_parallel()
	tw.tween_property(l, "position:y", l.position.y - 12, 0.9).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(l, "modulate:a", 0.0, 0.4).set_delay(0.5)
	tw.chain().tween_callback(l.queue_free)


func _banner(won: bool) -> void:
	_clear_hand()
	if ready_button:
		ready_button.visible = false
	_prompt("")
	var l := Art.label("Menang" if won else "Kalah", Vector2(0, 52), 320, Art.PRADA if won else Art.MERAH, Art.TEXT * 3, HORIZONTAL_ALIGNMENT_CENTER, Art.MALAM)
	_add(l)
	await _shot()
	await _wait(1.6)


# --- smoke test ----------------------------------------------------------------------------

func _shot() -> void:
	if shots_dir == "":
		return
	await RenderingServer.frame_post_draw
	shot_n += 1
	get_viewport().get_texture().get_image().save_png("%s/%02d.png" % [shots_dir, shot_n])


func _autoplay_turn() -> void:
	await _wait(0.6)
	for i in hand.size():
		if picks.size() >= _required():
			break
		_on_card(i)
		if not pending.is_empty():
			var t: Dictionary = {"kind": "enemy", "uid": _living_enemies()[0]} if pending.type == "serang" else {"kind": "player", "id": you}
			picks.append({"cardUid": pending.uid, "target": t})
			pending = {}
	_render_hand()
	await _wait(0.6)
	_submit()


func _autoplay_run() -> void:
	await _wait(0.6)
	var ph: Dictionary = run.phase
	match ph.kind:
		"vote":
			if ph.votes[you] == null:
				_send({"type": "vote", "choice": 0})
		"reward":
			if ph.pusakaOffer != null and int(ph.pusakaChooser) == you:
				_send({"type": "choose_pusaka", "id": ph.pusakaOffer[0].id})
			elif not ph.done[you]:
				_send({"type": "choose_card", "defId": ph.offers[0].defId})
		"rest":
			if not ph.done[you]:
				_send({"type": "rest", "choice": "heal"})
		"shop":
			if not ph.done[you]:
				_send({"type": "leave"})
		"ended":
			await _wait(2.0)
			get_tree().quit()
