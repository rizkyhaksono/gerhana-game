@tool
extends Node2D
## Asset preview: one combat layout built from the generated art. Not game logic.
## Space = everyone attacks, H = everyone is hit, B = switch to the Banaspati arena.

const ART := "res://assets/"
const GROUND := 112  # feet line on every background
const PAD := 8       # art/px.py PAD: the sprite sits at x = PAD inside every animation frame
const FRAMES := {"idle": 2, "attack": 4, "hit": 2}
const FPS := {"idle": 2.0, "attack": 10.0, "hit": 8.0}

const FOREST := [["heroes", "pendekar", 46], ["heroes", "dalang", 84],
	["enemies", "tuyul", 196], ["enemies", "kuntilanak", 232], ["enemies", "pocong", 268]]
const ARENA := [["heroes", "pendekar", 46], ["heroes", "dalang", 84], ["enemies", "banaspati", 210]]
const HAND := [["serang", "tebas"], ["tahan", "tangkis"], ["serang", "jurus_harimau"], ["bantu", "restu"]]

var actors: Array[AnimatedSprite2D] = []
var stage: Node2D
var in_arena := false


func _ready() -> void:
	_build()


func _build() -> void:
	if stage:
		stage.queue_free()
	stage = Node2D.new()
	add_child(stage)
	actors.clear()
	_sprite("backgrounds/" + ("arena_banaspati" if in_arena else "hutan_larangan"), Vector2.ZERO)
	for spec in (ARENA if in_arena else FOREST):
		_actor(spec[0], spec[1], spec[2])
	var timer := _animated("ui/timer_gerhana", {"loop": 8}, 0)
	timer.sprite_frames.set_animation_speed("loop", 1.0)
	timer.position = Vector2(148, 4)
	timer.play("loop")
	for i in HAND.size():
		var pos := Vector2(58 + i * 52, 128 - (6 if i == 2 else 0))  # third card lifted = selected
		_sprite("cards/kartu_" + HAND[i][0], pos)
		_sprite("card_art/" + HAND[i][1], pos + Vector2(12, 14))


func _sprite(path: String, pos: Vector2) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = load(ART + path + ".png")
	s.centered = false
	s.position = pos
	stage.add_child(s)
	return s


## anims maps animation name -> frame count; the sheet for "loop" is `base`, others are `base_<name>`.
func _animated(base: String, anims: Dictionary, height: int) -> AnimatedSprite2D:
	var frames := SpriteFrames.new()
	frames.remove_animation("default")
	for anim in anims:
		var sheet: Texture2D = load(ART + (base if anim == "loop" else base + "_" + anim) + ".png")
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
	stage.add_child(a)
	return a


func _actor(group: String, sprite_name: String, x: int) -> void:
	var h: int = load(ART + group + "/" + sprite_name + ".png").get_height()
	var a := _animated(group + "/" + sprite_name, FRAMES, h)
	a.position = Vector2(x - PAD, GROUND - h + 2)
	a.animation_finished.connect(func(): a.play("idle"))
	a.play("idle")
	actors.append(a)


func _unhandled_input(event: InputEvent) -> void:
	if Engine.is_editor_hint():
		return
	if not (event is InputEventKey and event.pressed and not event.echo):
		return
	match event.keycode:
		KEY_SPACE:
			for a in actors:
				a.play("attack")
		KEY_H:
			for a in actors:
				a.play("hit")
		KEY_B:
			in_arena = not in_arena
			_build()
