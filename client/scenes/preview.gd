@tool
extends Node2D
## Asset preview: one combat layout built from the generated art. Not game logic.
## Space = everyone attacks, H = everyone is hit, B = switch to the Banaspati arena.

const GROUND := 112  # feet line on every background
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
	stage.add_child(Art.sprite("backgrounds/" + ("arena_banaspati" if in_arena else "hutan_larangan"), Vector2.ZERO))
	for spec in (ARENA if in_arena else FOREST):
		var a := Art.actor(spec[0], spec[1], spec[2], GROUND)
		stage.add_child(a)
		actors.append(a)
	var timer := Art.animated("ui/timer_gerhana", {"loop": 8})
	timer.position = Vector2(148, 4)
	timer.play("loop")
	stage.add_child(timer)
	for i in HAND.size():
		var pos := Vector2(58 + i * 52, 128 - (6 if i == 2 else 0))  # third card lifted = selected
		stage.add_child(Art.sprite("cards/kartu_" + HAND[i][0], pos))
		stage.add_child(Art.sprite("card_art/" + HAND[i][1], pos + Vector2(12, 14)))


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
