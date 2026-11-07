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
