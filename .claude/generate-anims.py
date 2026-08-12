#!/usr/bin/env python3
"""
Build APNG idle-animation loops from Pants frame assets.
Output: static/Pants/Anim/

Layers (background-image z-order, topmost first):
  awake:
    blink-overlay.apng  — transparent hold; blink frames composited onto HEAD (not eyes_open)
    breath-eyes.apng    — eyes_open only, identical shifts/delays as breath-head → always in sync
    breath-head.apng    — head only, bobs with breath
  asleep (no blink-overlay; eyes_closed replaces breath-eyes, head/eyes dropped):
    breath-eyes-sleep.apng
    breath-head-sleep.apng
  transitions (one-shot, no blink-overlay; replace the head/eyes layer only
  while she's nodding off or rousing, then hand off to the awake/asleep pair) —
  exported as static per-frame PNGs, not an APNG, and stepped through by
  src/popup/popup.js itself; see the comment above TRANS_FRAMES for why:
    Transition/frame-00.png … frame-29.png  (head+eyes pre-composited)
  shared by both:
    tail-flick.apng
    breath-rpaw.apng    — right front paw, slightly behind head
    right_back_paw.png  (static)
    breath.apng         — body
    left_front_paw.png  (static)
    left_back_paw.png   (static)
"""

import math
from pathlib import Path
from PIL import Image

ROOT  = Path(__file__).resolve().parent.parent
PANTS = ROOT / "static" / "Pants"
BODY  = PANTS / "Body"
HEAD  = PANTS / "Head"
EYES  = HEAD / "Eyes"
BLINK = EYES / "Blink"
LIMBS = PANTS / "Limbs"
TAIL  = LIMBS / "Tail flick"
OUT   = PANTS / "Anim"

OUT.mkdir(exist_ok=True)

DISPLAY_W, DISPLAY_H = 723, 530  # 1/5 of 3615×2650 source canvas — 15:11 aspect ratio


def load(p: Path) -> Image.Image:
    img = Image.open(p).convert("RGBA")
    if img.size != (DISPLAY_W, DISPLAY_H):
        img = img.resize((DISPLAY_W, DISPLAY_H), Image.LANCZOS)
    return img


def shifted(layers_bottom_to_top: list, shift: float) -> Image.Image:
    """Paste layers offset vertically by `shift` px. Fractional shifts blend
    between the floor/ceil integer-pixel composites so motion reads as
    sub-pixel smooth instead of jumping a whole pixel at once."""
    def paste_at(s: int) -> Image.Image:
        canvas = Image.new("RGBA", (DISPLAY_W, DISPLAY_H), (0, 0, 0, 0))
        for img in layers_bottom_to_top:
            canvas.paste(img, (0, -s), img)
        return canvas

    base = math.floor(shift)
    frac = shift - base
    if frac == 0:
        return paste_at(base)
    return Image.blend(paste_at(base), paste_at(base + 1), frac)


def save_apng(out_path: Path, frames: list, delays: list):
    frames[0].save(
        out_path, save_all=True, append_images=frames[1:],
        loop=0, duration=delays, format="PNG",
    )
    print(f"  {out_path.name}  ({len(frames)} frames, {out_path.stat().st_size // 1024} KB)")


# ── shared breath timing ────────────────────────────────────────────────────
# body (breath.apng) is fixed hand-drawn art, so it stays on its own 16-frame
# timeline. head/eyes/rpaw are shift-generated, not hand-drawn, so they run
# on a separate, higher-resolution timeline for smoother motion — both total
# the same duration so everything still breathes in the same rhythm.
# 15% slower than the original [200, 120×7, 250, 120×7]
BREATH_DELAYS = [230, 138, 138, 138, 138, 138, 138, 138, 288,
                      138, 138, 138, 138, 138, 138, 138]
TOTAL_BREATH_MS = sum(BREATH_DELAYS)  # 2450ms — the shared cycle length

HEAD_FRAMES = 32  # up from 16 — more, sub-pixel-blended steps = smoother bob
_base, _rem = divmod(TOTAL_BREATH_MS, HEAD_FRAMES)
HEAD_DELAYS = [_base + 1 if i < _rem else _base for i in range(HEAD_FRAMES)]


def _smoothstep(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def _breath_pulse(phase: float, max_shift: float = 1.0,
                   hold_frac: float = 0.28, rise_frac: float = 0.22) -> float:
    """0 → eased rise → hold at max_shift → eased fall → 0, over phase in [0,1).
    Smoothstep on the rise/fall (instead of an instant jump) is what makes
    this read as a fluid bob instead of a mechanical twitch."""
    p = phase % 1.0
    t0 = hold_frac
    t1 = t0 + rise_frac
    t2 = t1 + hold_frac
    if p < t0:
        return 0.0
    if p < t1:
        return max_shift * _smoothstep((p - t0) / rise_frac)
    if p < t2:
        return max_shift
    if p < t2 + rise_frac:
        return max_shift * (1 - _smoothstep((p - t2) / rise_frac))
    return 0.0


# max 1px bob, now approached gradually instead of snapping; paw trails head
# by ~1/16 of the cycle (the original frame-to-frame lag, preserved in time
# rather than frame count) — at 32 frames that's ~2 frames, still "just behind".
RPAW_LAG_PHASE = 1 / 16
HEAD_SHIFTS = [_breath_pulse(i / HEAD_FRAMES) for i in range(HEAD_FRAMES)]
RPAW_SHIFTS = [_breath_pulse(i / HEAD_FRAMES - RPAW_LAG_PHASE) for i in range(HEAD_FRAMES)]

# how far the head/eyes drop for the sleeping pose, in display px. Positive = down.
# Tweak if head overlaps paws (reduce) or barely moves (increase).
SLEEP_DROP = 70

BREATH_PATHS = [
    BODY / "body_basic.png",
    BODY / "chest_breath-1.png",
    BODY / "chest_breath-2.png",
    BODY / "chest_breath-3.png",
    BODY / "chest_breath-4.png",
    BODY / "chest_breath-5.png",
    BODY / "chest_breath-6.png",
    BODY / "chest_breath-7.png",
    BODY / "chest_breath-8.png",
    BODY / "chest_breath-7.png",
    BODY / "chest_breath-6.png",
    BODY / "chest_breath-5.png",
    BODY / "chest_breath-4.png",
    BODY / "chest_breath-3.png",
    BODY / "chest_breath-2.png",
    BODY / "chest_breath-1.png",
]

BLINK_SEQ = [
    (BLINK / "eyes_blink_1.png", 55),
    (BLINK / "eyes_blink_2.png", 55),
    (BLINK / "eyes_blink_3.png", 55),
    (BLINK / "eyes_blink_4.png", 55),
    (EYES  / "eyes_closed.png", 110),
    (BLINK / "eyes_blink_4.png", 55),
    (BLINK / "eyes_blink_3.png", 55),
    (BLINK / "eyes_blink_2.png", 55),
    (BLINK / "eyes_blink_1.png", 55),
]


# ── body breath ───────────────────────────────────────────────────────────────
print("=== breath.apng ===")
save_apng(OUT / "breath.apng", [load(p) for p in BREATH_PATHS], BREATH_DELAYS)


# ── head bob (head only — no eyes) ───────────────────────────────────────────
print("=== breath-head.apng ===")
# Composite face onto head at source resolution before downscaling so thin
# whisker/nose lines survive the 1/5x LANCZOS resize instead of averaging away.
_head_raw = Image.open(HEAD / "head_bas8c.png").convert("RGBA")
_face_raw = Image.open(HEAD / "face.png").convert("RGBA")
_head_with_face = Image.alpha_composite(_head_raw, _face_raw)
_head_with_face = _head_with_face.resize((DISPLAY_W, DISPLAY_H), Image.LANCZOS)
head_img  = _head_with_face

ear_L_img = load(HEAD / "L_ear_0(base).png")
ear_R_img = load(HEAD / "R_ear_0(base).png")
save_apng(OUT / "breath-head.apng",
          [shifted([head_img], s) for s in HEAD_SHIFTS],
          HEAD_DELAYS)


# ── ear bob (each ear separately — same timing as head so they always sync) ───
print("=== breath-ear-L.apng ===")
save_apng(OUT / "breath-ear-L.apng",
          [shifted([ear_L_img], s) for s in HEAD_SHIFTS],
          HEAD_DELAYS)

print("=== breath-ear-R.apng ===")
save_apng(OUT / "breath-ear-R.apng",
          [shifted([ear_R_img], s) for s in HEAD_SHIFTS],
          HEAD_DELAYS)

# ── eyes bob (eyes_open only — identical timing to head so they always sync) ──
print("=== breath-eyes.apng ===")
eyes_open = load(EYES / "eyes_open.png")
save_apng(OUT / "breath-eyes.apng",
          [shifted([eyes_open], s) for s in HEAD_SHIFTS],
          HEAD_DELAYS)


# ── directional gaze eyes ──────────────────────────────────────────────────────
# Q1=top-left  Q2=top-right  Q3=bottom-right  Q4=bottom-left  (viewport quadrants)
# "base" = breath-eyes.apng (no gaze override)
#
# GAZE_MAP[loc] = [Q1, Q2, Q3, Q4]
GAZE_MAP = {
    "a": ["w",    "base", "s",    "sw"],
    "c": ["base", "e",    "se",   "s"],
    "d": ["n",    "ne",   "e",    "base"],
}

print("=== gaze eyes ===")
LOOK = EYES / "look"
_gaze_src = {
    "n":  "north",    "s":  "south",
    "e":  "east",     "w":  "west",
    "ne": "northeast","se": "southeast",
    "sw": "southwest","nw": "northwest",
}
for name, fname in _gaze_src.items():
    img = load(LOOK / f"{fname}.png")
    save_apng(OUT / f"eyes-{name}.apng",
              [shifted([img], s) for s in HEAD_SHIFTS],
              HEAD_DELAYS)

# ── sleeping head bob (same breath timing, dropped for the lying-down pose) ───
print("=== breath-head-sleep.apng ===")
save_apng(OUT / "breath-head-sleep.apng",
          [shifted([head_img], s - SLEEP_DROP) for s in HEAD_SHIFTS],
          HEAD_DELAYS)



# ── sleeping ears (pre-shifted — used by userChrome.css flat-stack approach) ──
print("=== breath-ear-L-sleep.apng ===")
save_apng(OUT / "breath-ear-L-sleep.apng",
          [shifted([ear_L_img], s - SLEEP_DROP) for s in HEAD_SHIFTS],
          HEAD_DELAYS)

print("=== breath-ear-R-sleep.apng ===")
save_apng(OUT / "breath-ear-R-sleep.apng",
          [shifted([ear_R_img], s - SLEEP_DROP) for s in HEAD_SHIFTS],
          HEAD_DELAYS)


# ── sleeping eyes (eyes_closed, no blink — same drop/timing as sleeping head) ─
print("=== breath-eyes-sleep.apng ===")
eyes_closed_img = load(EYES / "eyes_closed.png")
save_apng(OUT / "breath-eyes-sleep.apng",
          [shifted([eyes_closed_img], s - SLEEP_DROP) for s in HEAD_SHIFTS],
          HEAD_DELAYS)


# ── fall-asleep / wake-up transitions ──────────────────────────────────────────
# These used to be exported as one-shot APNGs (fall-asleep-head.apng etc).
# That was the source of the "chops back to the top" / "dropped frames" glitch:
# an embedded animated PNG's own playback clock in Gecko is tied to the shared
# image decoder, not to whichever CSS keyframe last swapped it in — so each
# time she revisits a location, the animation could resume mid-loop instead of
# restarting at frame 0, occasionally looping back to the *top* frame right in
# the middle of a window that should be holding at the bottom.
# Fixed by not using an embedded clock at all: each frame is exported as its
# own static PNG (head+eyes pre-composited, since they always move together),
# and src/popup/popup.js steps through them itself as individual CSS keyframe
# stops — the exact same steps(1)-per-percentage mechanism already proven
# reliable for the sprite pop and the margin ease, driven by one outer clock.
# TRANS_FRAMES must match TRANS_FRAME_COUNT in popup.js (kept in sync by hand).
TRANS_FRAMES = 30
TRANS_DIR    = OUT / "Transition"
TRANS_DIR.mkdir(exist_ok=True)


def ease_in_out_cubic(t: float) -> float:
    return 4 * t ** 3 if t < 0.5 else 1 - ((-2 * t + 2) ** 3) / 2


# eased *progress* (0..1) per frame — both the head shift and the eye stage
# are derived from this same sequence so they're always in lockstep, not
# racing each other on independent curves.
FALL_EASE   = [ease_in_out_cubic(i / (TRANS_FRAMES - 1)) for i in range(TRANS_FRAMES)]
# no round() here — fractional shifts flow through shifted()'s sub-pixel
# blending (same trick the breathing bob uses) instead of snapping between
# whole pixels, which is what made this choppy with only a few big jumps.
FALL_SHIFTS = [SLEEP_DROP * e for e in FALL_EASE]

# eyes ease through the same blink art already used for the awake blink, just
# stretched across the transition and held shut/open at the ends instead of
# snapping back — stage picked from the *same eased progress* as the head
# shift (not a plain linear frame count) so they stay paced together instead
# of the eyes visibly running ahead/behind the head's motion.
EYE_CLOSE_STAGES = [
    EYES / "eyes_open.png",
    BLINK / "eyes_blink_1.png",
    BLINK / "eyes_blink_2.png",
    BLINK / "eyes_blink_3.png",
    BLINK / "eyes_blink_4.png",
    EYES / "eyes_closed.png",
]


def stage_index(progress: float, n_stages: int) -> int:
    return min(n_stages - 1, int(progress * n_stages))


fall_eye_frames = [load(EYE_CLOSE_STAGES[stage_index(e, len(EYE_CLOSE_STAGES))])
                    for e in FALL_EASE]

print(f"=== transition frames ({TRANS_FRAMES}, static — used forward for falling asleep, reversed for waking up) ===")
for i in range(TRANS_FRAMES):
    # ears excluded — ::after ear_keyframes shows none during transitions, preventing double-ears
    frame = shifted([head_img, fall_eye_frames[i]], -FALL_SHIFTS[i])
    frame.save(TRANS_DIR / f"frame-{i:02d}.png")
print(f"  {TRANS_FRAMES} frames written to {TRANS_DIR.relative_to(ROOT)}")

# ── ear flick frames (pre-shifted for awake + sleep positions) ─────────────────
# JS steps through these on click, picking awake or sleep set so ears don't jump.
EAR_FLICK_DIR = OUT / "EarFlick"
EAR_FLICK_DIR.mkdir(exist_ok=True)
print("=== ear flick frames (awake + sleep positions) ===")
for n in ["01", "02", "03"]:
    for side, src in [("L", HEAD / "Ears" / f"L_ear_{n}.png"),
                      ("R", HEAD / "Ears" / f"R_ear_{n}.png")]:
        shifted([load(src)], 0).save(EAR_FLICK_DIR / f"{side}_{n}.png")
print(f"  6 frames written to {EAR_FLICK_DIR.relative_to(ROOT)}")


# ── blink overlay ─────────────────────────────────────────────────────────────
# Transparent during hold → bobbing eyes from breath-eyes.apng show through.
# Blink frames use HEAD as their backing (not eyes_open).
#   - Head fur covers the eye socket area → no phantom eyes_open layer
#   - Blink lash art composites on top of head
# This completely prevents the eyes_open layer below from bleeding through.
print("=== blink-overlay.apng ===")
head_flat   = shifted([head_img], 0)   # head at 0-shift — opaque backing for blink
transparent = Image.new("RGBA", (DISPLAY_W, DISPLAY_H), (0, 0, 0, 0))

blink_frames = [transparent]
blink_delays = [4350]
for path, delay in BLINK_SEQ:
    blink_frames.append(Image.alpha_composite(head_flat.copy(), load(path)))
    blink_delays.append(delay)

save_apng(OUT / "blink-overlay.apng", blink_frames, blink_delays)


# ── right front paw bob ───────────────────────────────────────────────────────
print("=== breath-rpaw.apng ===")
rpaw_img = load(LIMBS / "right_front_paw.png")
save_apng(OUT / "breath-rpaw.apng",
          [shifted([rpaw_img], s) for s in RPAW_SHIFTS],
          HEAD_DELAYS)


# ── tail flick ────────────────────────────────────────────────────────────────
def neighbor_blend(frames, w_side=0.12):
    """Blend each frame with prev/next neighbours. w_side controls neighbour weight."""
    wc = 1.0 - 2 * w_side
    out = []
    for i, f in enumerate(frames):
        prev = frames[max(0, i - 1)]
        nxt  = frames[min(len(frames) - 1, i + 1)]
        x = Image.blend(prev, f, wc / (w_side + wc))
        out.append(Image.blend(x, nxt, w_side))
    return out

print("=== tail-flick.apng ===")
flick_fwd = [(TAIL / f"flick_{i:02d}.png", 80) for i in range(1, 14)]
flick_fwd[-1] = (TAIL / "flick_13.png", 130)
flick_ret = [(TAIL / f"flick_{i:02d}.png", 80) for i in range(12, 0, -1)]
seq = [(TAIL / "flick_00(base).png", 11200)] + flick_fwd + flick_ret
delays = [d for _, d in seq]
frames = [load(p) for p, _ in seq]
frames[1:] = neighbor_blend(frames[1:], w_side=0.12)  # skip base hold frame
save_apng(OUT / "tail-flick.apng", frames, delays)


print("\ndone.")
