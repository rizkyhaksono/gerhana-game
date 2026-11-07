class_name Art
## Loads the generated art (art/out, linked as res://assets) into Godot nodes.

const ROOT := "res://assets/"
const PAD := 8  # art/px.py PAD: the sprite sits at x = PAD inside every animation frame
const FRAMES := {"idle": 2, "attack": 4, "hit": 2}
const FPS := {"idle": 2.0, "attack": 10.0, "hit": 8.0, "loop": 1.0}


static func tex(path: String) -> Texture2D:
	return load(ROOT + path + ".png")


static func sprite(path: String, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = tex(path)
	s.centered = false
	s.position = pos
	return s


## anims maps animation name -> frame count; the sheet for "loop" is `base`, others are `base_<name>`.
static func animated(base: String, anims: Dictionary, height := 0) -> AnimatedSprite2D:
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for anim in anims:
		var sheet := tex(base if anim == "loop" else base + "_" + anim)
		var n: int = anims[anim]
		var fw := sheet.get_width() / float(n)
		frames.add_animation(anim)
		frames.set_animation_loop(anim, anim in ["idle", "loop"])
		frames.set_animation_speed(anim, FPS.get(anim, 1.0))
		for i in n:
			var atlas := AtlasTexture.new()
			atlas.atlas = sheet
			atlas.region = Rect2(i * fw, 0, fw, height if height > 0 else sheet.get_height())
			frames.add_frame(anim, atlas)
	var a := AnimatedSprite2D.new()
	a.sprite_frames = frames
	a.centered = false
	return a


## A combatant whose attack/hit animations fall back to idle. Feet land on `ground`.
static func actor(group: String, sprite_name: String, x: float, ground: float) -> AnimatedSprite2D:
	var h := tex(group + "/" + sprite_name).get_height()
	var a := animated(group + "/" + sprite_name, FRAMES, h)
	a.position = Vector2(x - PAD, ground - h + 2)
	a.animation_finished.connect(func(): a.play("idle"))
	a.play("idle")
	return a


# --- type and UI skin ---------------------------------------------------------------

const TEXT := 9      # Aksara Malam's native size; 18 and 27 are exact 2x / 3x
const MALAM := Color("0f0d1f")
const NILA_TUA := Color("1e1b3a")
const PUTIH := Color("ece6d6")
const PERAK := Color("a9b8cf")
const KABUT := Color("5b6e99")
const PRADA := Color("e8b83a")
const PRADA_TERANG := Color("ffe58a")
const MERAH := Color("c23a2b")
const DARAH := Color("7a1c24")
const GAIB := Color("54e0c8")

static var _font: FontFile
static var _theme: Theme


static func font() -> FontFile:
	if _font == null:
		_font = load(ROOT + "font/aksara_malam.fnt")
		_font.fixed_size_scale_mode = TextServer.FIXED_SIZE_SCALE_INTEGER_ONLY
	return _font


## Label in Aksara Malam. size is a multiple of TEXT; a 1px (per scale) shadow keeps it readable on art.
static func label(text: String, pos: Vector2, width: float, color := PUTIH, size := TEXT, align := HORIZONTAL_ALIGNMENT_LEFT, shadow := MALAM) -> Label:
	var l := Label.new()
	var ls := LabelSettings.new()
	ls.font = font()
	ls.font_size = size
	ls.font_color = color
	ls.line_spacing = 0
	if shadow.a > 0:
		ls.shadow_color = shadow
		ls.shadow_offset = Vector2(0, size / TEXT)
		ls.shadow_size = 0
	l.label_settings = ls
	l.text = text
	l.horizontal_alignment = align
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	l.position = pos
	l.custom_minimum_size = Vector2(width, 0)
	l.size = Vector2(width, 0)
	return l


static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font = font()
	t.default_font_size = TEXT
	for type in ["Button", "LineEdit", "Label"]:
		t.set_font("font", type, font())
		t.set_font_size("font_size", type, TEXT)
	for state in ["normal", "hover", "pressed", "disabled"]:
		var sb := StyleBoxTexture.new()
		sb.texture = tex("ui/tombol_" + state)
		sb.set_texture_margin_all(3)
		sb.content_margin_left = 6
		sb.content_margin_right = 6
		sb.content_margin_top = 3
		sb.content_margin_bottom = 3
		t.set_stylebox(state, "Button", sb)
	t.set_stylebox("focus", "Button", t.get_stylebox("hover", "Button"))
	t.set_color("font_color", "Button", PUTIH)
	t.set_color("font_hover_color", "Button", PRADA_TERANG)
	t.set_color("font_focus_color", "Button", PRADA_TERANG)
	t.set_color("font_pressed_color", "Button", PRADA)
	t.set_color("font_disabled_color", "Button", KABUT)
	var edit := t.get_stylebox("normal", "Button").duplicate()
	t.set_stylebox("normal", "LineEdit", edit)
	t.set_stylebox("focus", "LineEdit", t.get_stylebox("hover", "Button"))
	t.set_color("font_color", "LineEdit", PUTIH)
	t.set_color("font_placeholder_color", "LineEdit", KABUT)
	t.set_color("caret_color", "LineEdit", PRADA)
	_theme = t
	return t


## Button in the shared skin. Sized through custom_minimum_size: outside the tree Godot measures with its own font.
static func button(text: String, pos: Vector2, size: Vector2, on_press: Callable) -> Button:
	var b := Button.new()
	b.theme = theme()
	b.text = text
	b.position = pos
	b.custom_minimum_size = size
	b.pressed.connect(on_press)
	return b


## Flat text button for menus: no box, gold when hovered or focused.
static func text_button(text: String, pos: Vector2, width: float, on_press: Callable) -> Button:
	var b := button(text, pos, Vector2(width, 11), on_press)
	b.flat = true
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		b.add_theme_stylebox_override(state, StyleBoxEmpty.new())
	return b
