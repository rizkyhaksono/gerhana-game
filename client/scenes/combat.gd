extends Node2D
## Playable co-op combat. Talks to packages/server over WebSocket; every rule lives on the server,
## this scene only shows the state, collects two picks and animates the events it gets back.

const SERVER_URL := "ws://127.0.0.1:8787"
const GROUND := 112
const HERO_X := [46, 84]
const CARD_X := 58
const CARD_Y := 120
const STEP := 0.35  # seconds per animated event

const MALAM := Color("0f0d1f")
const PUTIH := Color("ece6d6")
const PERAK := Color("a9b8cf")
const PRADA := Color("e8b83a")
const MERAH := Color("c23a2b")
const GAIB := Color("54e0c8")

const INTENT_ICON := {
	"attack": "niat_serang", "attackStatus": "niat_serang_semua", "status": "niat_status", "steal": "niat_curi",
	"flee": "niat_kabur", "evade": "niat_hindar", "charge": "niat_ancang", "drain": "niat_hisap", "destroyWayang": "niat_culik",
}
const STATUS_NAME := {"rentan": "Rentan", "lemah": "Lemah", "terbakar": "Terbakar"}
const ERRORS := {
	"NO_ROOM": "Kode room tidak ditemukan.", "ROOM_FULL": "Room sudah penuh.", "SLOW_DOWN": "Terlalu sering. Tunggu sebentar.",
	"WRONG_COUNT": "Pilih tepat 2 kartu.", "BAD_TARGET": "Target tidak sah.", "BAD_MESSAGE": "Pesan tidak dikenali server.",
}

var ws := WebSocketPeer.new()
var first_msg := {}          # sent as soon as the socket opens
var was_open := false
var inbox: Array = []
var busy := false

var you := 0
var state := {}              # last StateView from the server
var hand: Array = []         # CardView dicts
var picks: Array = []        # [{cardUid, target}]
var pending := {}            # card waiting for a target click
var sent := false
var turn_ms := 30000
var turn_started := 0

var theme_ui := Theme.new()
var menu: Control
var code_edit: LineEdit
var menu_status: Label
var world: Node2D
var actors := {}             # "p0" / "e1" -> {node, rect, bar, hp, intent, info}
var cards_layer: Control
var hud: Control
var status_label: Label
var ready_button: Button
var timer_sprite: Sprite2D


## Smoke test: GERHANA_AUTOPLAY=1 starts a bot game and plays the first legal cards every turn.
var autoplay := OS.get_environment("GERHANA_AUTOPLAY") == "1"


func _ready() -> void:
	_build_theme()
	_show_menu()
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
		_show_menu("Koneksi ke server terputus.")
	if timer_sprite and not sent and turn_ms > 0:
		var t := float(Time.get_ticks_msec() - turn_started) / turn_ms
		timer_sprite.frame = clampi(int(t * 8), 0, 7)


# --- network ---------------------------------------------------------------------

func _connect_and_send(msg: Dictionary) -> void:
	ws = WebSocketPeer.new()
	was_open = false
	first_msg = msg
	var err := ws.connect_to_url(SERVER_URL)
	menu_status.text = "Menghubungkan ke server…" if err == OK else "Gagal menghubungkan (%d)." % err


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
				menu_status.text = "Kode room: %s\nBagikan kode ini ke temanmu." % m.code
		"turn_start":
			if world == null:
				_show_combat()
			state = m.state
			hand = m.hand
			turn_ms = int(m.turnMs)
			turn_started = Time.get_ticks_msec()
			picks.clear()
			pending = {}
			sent = false
			_render_state()
			_render_hand()
			if state.players[you].pingsan:
				sent = true
				_send({"type": "play_cards", "picks": []})
				_say("Kamu pingsan. Rekanmu berjuang sendiri.")
			else:
				_say("Pilih 2 kartu.")
				if autoplay:
					_autoplay_turn()
		"partner_ready":
			if int(m.player) != you and not sent:
				_say("Rekan sudah siap.")
		"turn_resolved":
			_clear_hand()
			await _animate(m.events)
			state = m.state
			_render_state()
		"combat_end":
			state = m.state
			_render_state()
			_show_result(m.outcome == "won")
			if autoplay:
				print("AUTOPLAY RESULT: ", m.outcome, " turns=", int(state.turn))
				await _wait(1.5)
				get_tree().quit()
		"error":
			var text: String = ERRORS.get(m.code, "Server menolak: %s" % m.code)
			if world:
				_say(text)
				if sent and m.code in ["WRONG_COUNT", "BAD_TARGET", "NOT_IN_HAND", "DUPLICATE"]:
					sent = false
					ready_button.disabled = false
			else:
				menu_status.text = text


# --- menu ------------------------------------------------------------------------

func _show_menu(message := "") -> void:
	for c in get_children():
		c.queue_free()
	world = null
	timer_sprite = null
	actors.clear()
	add_child(Art.sprite("backgrounds/peta", Vector2.ZERO))
	menu = Control.new()
	menu.theme = theme_ui
	menu.size = Vector2(320, 180)
	add_child(menu)
	var title := _label("Gerhana", Vector2(0, 22), Vector2(320, 30), 24, PRADA, HORIZONTAL_ALIGNMENT_CENTER)
	menu.add_child(title)
	menu.add_child(_label("Co-op deckbuilder di malam gerhana", Vector2(0, 52), Vector2(320, 10), 7, PERAK, HORIZONTAL_ALIGNMENT_CENTER))
	menu.add_child(_button("Main dengan bot", Vector2(110, 72), Vector2(100, 16), func(): _connect_and_send({"type": "create_room", "name": "Pemain", "bot": true})))
	menu.add_child(_button("Buat room", Vector2(110, 92), Vector2(100, 16), func(): _connect_and_send({"type": "create_room", "name": "Pemain"})))
	code_edit = LineEdit.new()
	code_edit.placeholder_text = "Kode room"
	code_edit.max_length = 6
	code_edit.add_theme_font_size_override("font_size", 7)
	code_edit.position = Vector2(110, 112)
	code_edit.custom_minimum_size = Vector2(56, 16)
	menu.add_child(code_edit)
	menu.add_child(_button("Gabung", Vector2(170, 112), Vector2(40, 16), func():
		_connect_and_send({"type": "join_room", "code": code_edit.text.strip_edges(), "name": "Pemain"})))
	menu_status = _label(message, Vector2(20, 136), Vector2(280, 30), 7, PUTIH, HORIZONTAL_ALIGNMENT_CENTER)
	menu.add_child(menu_status)


# --- combat view -------------------------------------------------------------------

func _show_combat() -> void:
	for c in get_children():
		c.queue_free()
	world = Node2D.new()
	add_child(world)
	cards_layer = Control.new()
	cards_layer.theme = theme_ui
	cards_layer.size = Vector2(320, 180)
	cards_layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(cards_layer)
	hud = Control.new()
	hud.theme = theme_ui
	hud.size = Vector2(320, 180)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(hud)
	var bg := "arena_banaspati" if _has_enemy("banaspati") else "hutan_larangan"
	world.add_child(Art.sprite("backgrounds/" + bg, Vector2.ZERO))
	timer_sprite = Art.sprite("ui/timer_gerhana", Vector2(148, 4))
	timer_sprite.hframes = 8
	world.add_child(timer_sprite)
	status_label = _label("", Vector2(4, 4), Vector2(140, 20), 7, PUTIH)
	hud.add_child(status_label)
	ready_button = _button("Siap", Vector2(270, 156), Vector2(44, 16), _submit)
	hud.add_child(ready_button)


func _has_enemy(def_id: String) -> bool:
	for e in state.get("enemies", []):
		if e.defId == def_id:
			return true
	return false


func _render_state() -> void:
	var keys := []
	for p in state.players:
		keys.append("p%d" % int(p.id))
	for e in state.enemies:
		keys.append(e.uid)
	if keys != actors.keys():
		_build_actors()
	for p in state.players:
		var a: Dictionary = actors["p%d" % int(p.id)]
		_update_bar(a, p.hp, p.maxHp)
		var extra := []
		if p.block > 0:
			extra.append("Perisai %d" % p.block)
		if p.wayang > 0:
			extra.append("Wayang %d" % p.wayang)
		if p.jurusStacks > 0:
			extra.append("Jurus %d" % p.jurusStacks)
		a.info.text = "\n".join(extra + _status_lines(p.statuses)) + ("\n%d koin" % p.coins if p.coins > 0 else "")
		a.node.modulate = Color(0.45, 0.45, 0.55) if p.pingsan else Color.WHITE
	for e in state.enemies:
		var a: Dictionary = actors[e.uid]
		_update_bar(a, e.hp, e.maxHp)
		a.info.text = "\n".join(_status_lines(e.statuses))
		var gone: bool = e.hp <= 0 or e.fled
		a.node.modulate.a = 0.0 if gone else 1.0
		a.bar.visible = not gone
		_render_intent(a, e.intent if not gone else null)


func _build_actors() -> void:
	for a in actors.values():
		for n in [a.node, a.bar, a.intent, a.info]:
			n.queue_free()
	actors.clear()
	for p in state.players:
		var x: int = HERO_X[int(p.id)]
		_add_actor("p%d" % int(p.id), "heroes", p.character, x)
	var cursor := 302
	var list: Array = state.enemies.duplicate()
	list.reverse()
	for e in list:
		var w := Art.tex("enemies/" + e.defId).get_width()
		cursor -= w
		_add_actor(e.uid, "enemies", e.defId, cursor)
		cursor -= 4


func _add_actor(key: String, group: String, sprite_name: String, x: int) -> void:
	var size := Art.tex(group + "/" + sprite_name).get_size()
	var node := Art.actor(group, sprite_name, x, GROUND)
	world.add_child(node)
	var top := GROUND - size.y + 2
	var bar := Control.new()
	bar.position = Vector2(x + size.x / 2 - 17, GROUND + 3)
	var frame := TextureRect.new()
	frame.texture = Art.tex("ui/bar_frame")
	bar.add_child(frame)
	var fill := TextureProgressBar.new()
	fill.texture_progress = Art.tex("ui/bar_hp")
	fill.position = Vector2(1, 1)
	bar.add_child(fill)
	var hp := _label("", Vector2(-4, -6), Vector2(42, 6), 5, PUTIH, HORIZONTAL_ALIGNMENT_CENTER)
	bar.add_child(hp)
	hud.add_child(bar)
	var intent := Control.new()
	intent.position = Vector2(x + size.x / 2, top - 13)
	hud.add_child(intent)
	var info := _label("", Vector2(x - 2, top - 2) if group == "enemies" else Vector2(x + size.x + 1, top + 4), Vector2(34, 30), 5, PERAK)
	hud.add_child(info)
	actors[key] = {"node": node, "rect": Rect2(x, top, size.x, size.y), "bar": bar, "fill": fill, "hp": hp, "intent": intent, "info": info}


func _update_bar(a: Dictionary, hp: float, max_hp: float) -> void:
	a.fill.max_value = max_hp
	a.fill.value = hp
	a.hp.text = "%d/%d" % [hp, max_hp]


func _status_lines(statuses: Dictionary) -> Array:
	var out := []
	for k in statuses:
		out.append("%s %d" % [STATUS_NAME.get(k, k), statuses[k]])
	return out


func _render_intent(a: Dictionary, intent) -> void:
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
	var amount := "%d" % intent.amount if intent.amount > 0 else ""
	if intent.has("status"):
		amount += (" " if amount else "") + "%s %d" % [STATUS_NAME.get(intent.status, intent.status), intent.stacks]
	a.intent.add_child(_label(amount + ("→" + who if who else ""), Vector2(-20, -8), Vector2(40, 8), 5, PUTIH, HORIZONTAL_ALIGNMENT_CENTER))


# --- hand and picks ----------------------------------------------------------------

func _clear_hand() -> void:
	for c in cards_layer.get_children():
		c.queue_free()
	ready_button.disabled = true


func _render_hand() -> void:
	_clear_hand()
	for i in hand.size():
		var c: Dictionary = hand[i]
		var order := _pick_index(c.uid)
		var btn := Button.new()
		btn.flat = true
		btn.focus_mode = Control.FOCUS_NONE
		btn.position = Vector2(CARD_X + i * 52, CARD_Y - (6 if order >= 0 else 0))
		btn.size = Vector2(48, 64)
		btn.tooltip_text = "%s: %s" % [c.name, c.text]
		btn.pressed.connect(_on_card.bind(i))
		var frame := TextureRect.new()
		frame.texture = Art.tex("cards/kartu_%s%s" % [c.type, "_plus" if c.upgraded else ""])
		frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
		btn.add_child(frame)
		var art_path := "res://assets/card_art/%s.png" % _art_id(c.defId)
		if ResourceLoader.exists(art_path):
			var art := TextureRect.new()
			art.texture = load(art_path)
			art.position = Vector2(12, 14)
			art.mouse_filter = Control.MOUSE_FILTER_IGNORE
			btn.add_child(art)
		btn.add_child(_label(c.name, Vector2(3, 3), Vector2(42, 9), 5, PUTIH, HORIZONTAL_ALIGNMENT_CENTER))
		var text := _label(c.text, Vector2(5, 43), Vector2(38, 16), 5, MALAM, HORIZONTAL_ALIGNMENT_CENTER)
		text.clip_text = false
		text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		text.size = Vector2(38, 16)
		btn.add_child(text)
		if order >= 0:
			var badge := _label("%d" % (order + 1), Vector2(38, 14), Vector2(8, 8), 7, PRADA)
			btn.add_child(badge)
		if not pending.is_empty() and pending.uid == c.uid:
			btn.modulate = Color(1.2, 1.2, 0.8)
		cards_layer.add_child(btn)
	ready_button.disabled = sent or picks.size() != _required()


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
					_say("Klik musuh yang diserang %s." % c.name)
			"bantu":
				pending = c
				_say("Klik pendekar penerima %s." % c.name)
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
		if not actors[key].rect.grow(2).has_point(pos):
			continue
		if pending.type == "serang" and key in _living_enemies():
			picks.append({"cardUid": pending.uid, "target": {"kind": "enemy", "uid": key}})
		elif pending.type == "bantu" and key.begins_with("p") and not state.players[int(key.substr(1))].pingsan:
			picks.append({"cardUid": pending.uid, "target": {"kind": "player", "id": int(key.substr(1))}})
		else:
			continue
		pending = {}
		_say("Pilih 2 kartu." if picks.size() < _required() else "Tekan Siap.")
		_render_hand()
		return


func _autoplay_turn() -> void:
	await _wait(0.4)
	for i in hand.size():
		if picks.size() >= _required():
			break
		_on_card(i)
		if not pending.is_empty():
			var key: String = _living_enemies()[0] if pending.type == "serang" else "p%d" % you
			picks.append({"cardUid": pending.uid, "target": {"kind": "enemy", "uid": key} if pending.type == "serang" else {"kind": "player", "id": you}})
			pending = {}
	_render_hand()
	await _wait(0.4)
	_submit()


func _submit() -> void:
	if sent or picks.size() != _required():
		return
	sent = true
	ready_button.disabled = true
	_send({"type": "play_cards", "picks": picks})
	_say("Menunggu rekan…")


# --- events ----------------------------------------------------------------------

func _target_key(t: Dictionary) -> String:
	return "p%d" % int(t.id) if t.kind == "player" else t.uid


func _animate(events: Array) -> void:
	for e in events:
		match e.t:
			"card":
				var a = actors.get("p%d" % int(e.player))
				if a and e.target.kind == "enemy":
					a.node.play("attack")
				await _wait(STEP * 0.5)
			"damage":
				var a = actors.get(_target_key(e.to))
				if a:
					a.node.play("hit")
					_float(a, "-%d" % int(e.amount), MERAH)
					a.fill.value = e.hpAfter
					a.hp.text = "%d/%d" % [e.hpAfter, a.fill.max_value]
				await _wait(STEP)
			"block":
				_float(actors.get("p%d" % int(e.player)), "+%d perisai" % int(e.amount), PERAK)
				await _wait(STEP * 0.6)
			"wayang":
				_float(actors.get("p%d" % int(e.player)), "wayang %d" % int(e.hp), PRADA)
				await _wait(STEP * 0.6)
			"status":
				_float(actors.get(_target_key(e.to)), "%s %d" % [STATUS_NAME.get(e.status, e.status), int(e.stacks)], GAIB)
				await _wait(STEP * 0.6)
			"steal":
				_float(actors.get("p%d" % int(e.player)), "-%d koin" % int(e.amount), PRADA)
				await _wait(STEP)
			"coinsReturned":
				_float(actors.get("p%d" % int(e.player)), "+%d koin" % int(e.amount), PRADA)
				await _wait(STEP * 0.6)
			"flee", "enemyDied":
				var a = actors.get(e.enemy)
				if a:
					_float(a, "Kabur!" if e.t == "flee" else "Tumbang", PUTIH)
					create_tween().tween_property(a.node, "modulate:a", 0.0, STEP)
				await _wait(STEP)
			"pingsan":
				var a = actors.get("p%d" % int(e.player))
				if a:
					_float(a, "Pingsan", MERAH)
					a.node.modulate = Color(0.45, 0.45, 0.55)
				await _wait(STEP)


func _wait(seconds: float) -> void:
	await get_tree().create_timer(seconds).timeout


func _float(a, text: String, color: Color) -> void:
	if a == null:
		return
	var l := _label(text, a.rect.position + Vector2(-8, -4), Vector2(a.rect.size.x + 16, 8), 6, color, HORIZONTAL_ALIGNMENT_CENTER)
	hud.add_child(l)
	var tw := create_tween().set_parallel()
	tw.tween_property(l, "position:y", l.position.y - 10, 0.7)
	tw.tween_property(l, "modulate:a", 0.0, 0.7).set_delay(0.3)
	tw.chain().tween_callback(l.queue_free)


func _show_result(won: bool) -> void:
	_clear_hand()
	_say("")
	ready_button.visible = false
	var panel := NinePatchRect.new()
	panel.texture = Art.tex("ui/panel")
	panel.patch_margin_left = 6
	panel.patch_margin_top = 6
	panel.patch_margin_right = 6
	panel.patch_margin_bottom = 6
	panel.position = Vector2(70, 46)
	panel.size = Vector2(180, 64)
	hud.add_child(panel)
	panel.add_child(_label("Menang!" if won else "Kalah…", Vector2(0, 8), Vector2(180, 16), 14, PRADA if won else MERAH, HORIZONTAL_ALIGNMENT_CENTER))
	panel.add_child(_button("Lawan lagi", Vector2(12, 40), Vector2(80, 16), func():
		panel.queue_free()
		actors.clear()
		world.queue_free()
		world = null
		_send({"type": "play_again"})))
	panel.add_child(_button("Menu", Vector2(100, 40), Vector2(68, 16), func():
		ws.close()
		was_open = false
		_show_menu()))


func _say(text: String) -> void:
	if status_label:
		status_label.text = text


# --- small UI helpers ------------------------------------------------------------

func _label(text: String, pos: Vector2, size: Vector2, font_size: int, color: Color, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := Label.new()
	var ls := LabelSettings.new()
	ls.font_size = font_size
	ls.font_color = color
	ls.outline_size = 2 if color != MALAM else 0
	ls.outline_color = MALAM
	ls.line_spacing = -1
	l.label_settings = ls  # before size: the default font would otherwise grow the box
	l.text = text
	l.horizontal_alignment = align
	l.clip_text = true
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.position = pos
	l.size = size
	return l


func _button(text: String, pos: Vector2, size: Vector2, on_press: Callable) -> Button:
	var b := Button.new()
	b.theme = theme_ui
	b.add_theme_font_size_override("font_size", 7)
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.pressed.connect(on_press)
	b.position = pos
	# not `size`: outside the tree the minimum size is measured with the engine's 16px font and would win
	b.custom_minimum_size = size
	return b


func _build_theme() -> void:
	theme_ui.default_font_size = 7
	for state_name in ["normal", "hover", "pressed", "disabled"]:
		var sb := StyleBoxTexture.new()
		sb.texture = Art.tex("ui/tombol_" + state_name)
		sb.set_texture_margin_all(4)
		sb.set_content_margin_all(2)
		theme_ui.set_stylebox(state_name, "Button", sb)
	theme_ui.set_color("font_color", "Button", PUTIH)
	theme_ui.set_color("font_hover_color", "Button", PUTIH)
	theme_ui.set_color("font_disabled_color", "Button", PERAK)
	var edit := StyleBoxFlat.new()
	edit.bg_color = Color("1e1b3a")
	edit.border_color = PRADA
	edit.set_border_width_all(1)
	edit.set_content_margin_all(2)
	theme_ui.set_stylebox("normal", "LineEdit", edit)
	theme_ui.set_stylebox("focus", "LineEdit", edit)
	theme_ui.set_color("font_color", "LineEdit", PUTIH)
