"""8-bit gamelan background loops, synthesised from scratch (stdlib only), then encoded to MP3 with ffmpeg.

Three loops (GDD §7): peta (calm), combat, boss. Slendro-like 5-tone scale played on NES-style
channels: pulse leads for saron/bonang, triangle bass and gong, noise channel for the kendang.
"""
import math
import os
import random
import struct
import subprocess
import wave

SR = 22050
SLENDRO = [1.0, 1.149, 1.320, 1.516, 1.741]  # ~240-cent steps


def scale(base, degree):
    octave, step = divmod(degree, len(SLENDRO))
    return base * SLENDRO[step] * (2 ** octave)


# --- 8-bit voices: NES-style pulse, triangle and noise channels with stepped volume ----------

def _wave(kind, phase, duty):
    f = phase % 1.0
    if kind == "pulse":
        return 1.0 if f < duty else -1.0
    return 4 * abs(f - 0.5) - 1  # triangle


def _steps(env):
    return math.floor(env * 15) / 15  # 16 volume levels, like the NES APU


def add_note(buf, start, freq, dur, amp, kind="pulse", decay=3.0, duty=0.25, vibrato=0.0):
    i0 = int(start * SR)
    n = min(int(dur * SR), len(buf) - i0)
    phase = 0.0
    for i in range(n):
        t = i / SR
        f = freq * (1 + vibrato * math.sin(2 * math.pi * 6 * t) * min(1, t * 4))
        phase += f / SR
        buf[i0 + i] += amp * _steps(math.exp(-t * decay)) * _wave(kind, phase, duty)


def add_gong(buf, start, freq, amp):
    add_note(buf, start, freq, 3.0, amp, "triangle", 0.9, vibrato=0.02)  # deep triangle with a slow wobble


def add_noise(buf, start, amp, low, rng):
    """Noise channel: random level held for `hold` samples; a longer hold sounds lower, like a kendang."""
    i0 = int(start * SR)
    n = min(int((0.18 if low else 0.07) * SR), len(buf) - i0)
    hold = 24 if low else 6
    level = 0.0
    for i in range(n):
        if i % hold == 0:
            level = rng.choice([-1.0, 1.0])
        buf[i0 + i] += amp * _steps(math.exp(-i / SR * (16 if low else 40))) * level


def compose(seed, beat, beats, base, drums, density):
    rng = random.Random(seed)
    buf = [0.0] * int(beat * beats * SR + 4 * SR)  # tail lets the last gong ring; trimmed below
    melody = [rng.randint(0, 6) for _ in range(16)]  # one 16-beat balungan, repeated with variation
    for b in range(beats):
        t = b * beat
        deg = melody[b % 16] + (1 if b >= beats // 2 and b % 4 == 2 else 0)
        # saron melody on pulse 1 (25% duty: the classic bright NES lead)
        add_note(buf, t, scale(base, deg), beat * 0.95, 0.20, "pulse", 3.0, 0.25)
        if rng.random() < density:  # bonang ornaments on pulse 2 (12.5% duty, thinner), an octave up
            add_note(buf, t + beat / 2, scale(base * 2, deg + rng.choice([0, 1, 2])), beat * 0.45, 0.10, "pulse", 6.0, 0.125)
        if b % 2 == 0:  # bass on the triangle channel
            add_note(buf, t, scale(base / 2, melody[(b // 4) * 4 % 16]), beat * 1.9, 0.28, "triangle", 1.0)
        if b % 4 == 3:  # kenong: short square accent
            add_note(buf, t, scale(base / 2, deg), beat * 0.6, 0.12, "pulse", 5.0, 0.5)
        if b % 16 == 15:
            add_gong(buf, t, base / 4, 0.35)
        if drums:
            add_noise(buf, t, 0.22, b % 2 == 0, rng)
            if rng.random() < drums:
                add_noise(buf, t + beat / 2, 0.14, False, rng)
    loop = int(beat * beats * SR)
    # fold the ringing tail back onto the start so the loop is seamless
    for i in range(len(buf) - loop):
        buf[i] += buf[loop + i]
    return buf[:loop]


def write(path_mp3, samples):
    peak = max(abs(s) for s in samples) or 1
    wav = path_mp3[:-4] + ".wav"
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(32000 * math.tanh(1.4 * s / peak))) for s in samples))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-c:a", "libmp3lame", "-b:a", "96k", path_mp3], check=True)
    os.remove(wav)


TRACKS = {
    "musik_peta": dict(seed=3, beat=0.62, beats=48, base=196.0, drums=0, density=0.35),
    "musik_combat": dict(seed=7, beat=0.36, beats=96, base=220.0, drums=0.35, density=0.6),
    "musik_boss": dict(seed=11, beat=0.3, beats=128, base=164.8, drums=0.7, density=0.8),
}


def build(out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for name, spec in TRACKS.items():
        samples = compose(**spec)
        assert len(samples) == int(spec["beat"] * spec["beats"] * SR)
        write(os.path.join(out_dir, name + ".mp3"), samples)
    return len(TRACKS)


if __name__ == "__main__":
    print(build(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "audio")), "tracks")
