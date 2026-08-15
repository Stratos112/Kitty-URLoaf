#!/usr/bin/env python3
"""Pre-build userChrome.css with all assets inlined as data URIs.
userChrome.css lives in the Firefox profile and cannot reference extension
files, so everything must be self-contained.

Three-layer design:
  element background-image  → REST layer (cushion/body/paws/tail)
  element::before            → HEAD layer (head/eyes — awake/asleep with transitions)
  element::after             → EAR layer (pseudo-random L/R twitches, independent of head cycle)

Ear Y positioning:
  --ear-y is animated on the element and inherited by ::after.
  ::after applies transform: translateY(var(--ear-y)) so the ear box snaps
  down for the sleep pose without needing separate sleep ear assets.

Animation cycle:
  One-time appear (APPEAR_SECONDS): cushion APNG plays, then body/head/ears snap in.
  Head loop (LOOP_CYCLE = 23s): awake → falling → asleep → waking → repeat
  Ear loop (RANDOM_CYCLE = 90s): pseudo-random L/R twitches at varied intervals, seeded for reproducibility
  Cat and cushion never re-appear after the initial intro.

Output: static/userChrome.css
"""

import base64
import random
from datetime import date
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
PANTS = ROOT / "static" / "Pants"
ANIM  = PANTS / "Anim"
LIMBS = PANTS / "Limbs"
BODY  = PANTS / "Body"
ACC   = PANTS / "Accessories"
OUT   = ROOT / "static" / "userChrome.css"

def data_uri(path: Path) -> str:
    mime = "image/apng" if path.suffix == ".apng" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

HOLD_SECONDS      = 10
APPEAR_SECONDS    = 1.5
TRANS_SECONDS     = 1.5
TRANS_FRAME_COUNT = 30
SLEEP_DROP        = 35        # px ear drops during sleep (::after translateY)
C_H               = 166
PT_H              = 34
W, H              = "364px", "266px"
Y_SHIFT           = 30

# REST layer: body / paws / tail / cushion — always visible after appear
REST_PATHS = [
    ANIM  / "tail-flick.apng",
    ANIM  / "breath-rpaw.apng",
    LIMBS / "right_back_paw.png",
    ANIM  / "breath.apng",
    BODY  / "body_basic.png",
    LIMBS / "left_front_paw.png",
    LIMBS / "left_back_paw.png",
    ACC   / "cushion_base.png",
]

# HEAD layer: head / eyes (no ears)
AWAKE_HEAD_PATHS = [
    ANIM / "blink-overlay.apng",
    ANIM / "breath-eyes.apng",
    ANIM / "breath-head.apng",
]
SLEEP_HEAD_PATHS = [
    ANIM / "breath-eyes-sleep.apng",
    ANIM / "breath-head-sleep.apng",
]

# EAR layer: awake ear APNGs; --ear-y handles sleep drop via translateY
AWAKE_EAR_PATHS   = [ANIM / "breath-ear-L.apng", ANIM / "breath-ear-R.apng"]
TRANS_FRAME_PATHS = [ANIM / "Transition" / f"frame-{i:02d}.png" for i in range(TRANS_FRAME_COUNT)]

CUSH_APPEAR_PATH = ANIM / "cushion-appear.apng"

EAR_FLICK_DIR = ANIM / "EarFlick"
EAR_FLICK_SEQ = ["01", "02", "03", "02", "01"]
EAR_FLICK_L   = [EAR_FLICK_DIR / f"L_{n}.png" for n in EAR_FLICK_SEQ]
EAR_FLICK_R   = [EAR_FLICK_DIR / f"R_{n}.png" for n in EAR_FLICK_SEQ]

FRAME_COUNT  = len(EAR_FLICK_SEQ)   # 5
FLICK_SECS   = 0.275
FRAME_SECS   = FLICK_SECS / FRAME_COUNT
LOOP_CYCLE   = HOLD_SECONDS * 2 + TRANS_SECONDS * 2  # 23s

t_falling    = float(HOLD_SECONDS)     # 10.0s
t_asleep     = t_falling + TRANS_SECONDS  # 11.5s
t_waking     = t_asleep  + HOLD_SECONDS  # 21.5s

# ear cycle: independent pseudo-random L/R twitches
RANDOM_CYCLE = 90.0    # 90s — drifts against 23s head cycle for variety
RANDOM_SEED  = 10      # gives R/L/R/L at 20s, 39s, 53s, 78s
MIN_GAP      = 10.0    # min seconds between twitches
MAX_GAP      = 28.0    # max seconds between twitches

print("Loading assets…")
all_paths = list(dict.fromkeys([
    CUSH_APPEAR_PATH,
    *REST_PATHS, *AWAKE_HEAD_PATHS, *SLEEP_HEAD_PATHS,
    *AWAKE_EAR_PATHS, *TRANS_FRAME_PATHS,
    *EAR_FLICK_L, *EAR_FLICK_R,
]))
uri = {p: data_uri(p) for p in all_paths}
print(f"  {len(uri)} files loaded")

def url(p):   return f'url("{uri[p]}")'
def imgs(ps): return ", ".join(url(p) for p in ps)
def lp(t):    return t / LOOP_CYCLE * 100   # loop percent
def px(n):    return f"{n:.2f}px"

rest_imgs       = imgs(REST_PATHS)
awake_head_imgs = imgs(AWAKE_HEAD_PATHS)
sleep_head_imgs = imgs(SLEEP_HEAD_PATHS)
awake_ear_imgs  = imgs(AWAKE_EAR_PATHS)
trans_urls      = [url(p) for p in TRANS_FRAME_PATHS]

POS = "left 91px top 0px"


def rest_appear_keyframes():
    cush = f"background-image: {url(CUSH_APPEAR_PATH)}; background-position: left 91px top var(--cat-y);"
    show = f"background-image: {rest_imgs}; background-position: left 91px top var(--cat-y);"
    return "\n".join(["@keyframes pants-rest-appear {",
                      f"  0%   {{ {cush} }}",
                      f"  100% {{ {show} }}",
                      "}"])


def head_loop_keyframes():
    awake  = f"background-image: {awake_head_imgs}; background-position: {POS};"
    asleep = f"background-image: {sleep_head_imgs}; background-position: {POS};"
    span   = TRANS_SECONDS

    def trans(t_start, reverse=False):
        return [
            (f"{lp(t_start + span * i / TRANS_FRAME_COUNT):.4f}",
             f"background-image: {trans_urls[TRANS_FRAME_COUNT-1-i if reverse else i]}; background-position: {POS};")
            for i in range(TRANS_FRAME_COUNT)
        ]

    pts = (
        [("0.0000", awake)]
        + trans(t_falling)
        + [(f"{lp(t_asleep):.4f}", asleep)]
        + trans(t_waking, reverse=True)
        + [("100.0000", awake)]
    )
    return "\n".join(["@keyframes pants-head-loop {",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_random_keyframes():
    awake  = f"background-image: {awake_ear_imgs}; background-position: {POS};"
    # Use static rest-position PNGs (L_01 / R_01) as the base during flicks —
    # avoids embedding the large breathing APNGs on every flick keyframe.
    R_rest = url(EAR_FLICK_R[0])   # R_01.png = right ear at rest
    L_rest = url(EAR_FLICK_L[0])   # L_01.png = left ear at rest
    rng    = random.Random(RANDOM_SEED)
    pts    = [("0.0000", awake)]
    t = rng.uniform(MIN_GAP, MAX_GAP)
    while t + FLICK_SECS < RANDOM_CYCLE - MIN_GAP:
        side = rng.choice(('L', 'R'))
        for i in range(FRAME_COUNT):
            fp    = EAR_FLICK_L[i] if side == 'L' else EAR_FLICK_R[i]
            imgs2 = f"{url(fp)}, {R_rest}" if side == 'L' else f"{L_rest}, {url(fp)}"
            pts.append((f"{(t + i * FRAME_SECS) / RANDOM_CYCLE * 100:.4f}",
                        f"background-image: {imgs2}; background-position: {POS};"))
        pts.append((f"{(t + FLICK_SECS) / RANDOM_CYCLE * 100:.4f}", awake))
        t += rng.uniform(MIN_GAP, MAX_GAP)
    pts.append(("100.0000", awake))
    return "\n".join(["@keyframes pants-ear-random {",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_y_loop_keyframes():
    ease = "animation-timing-function: ease-in-out;"
    sy   = f"{SLEEP_DROP}px"
    pts  = {
        "0.0000":               "--ear-y: 0px;",
        f"{lp(t_falling):.4f}": f"--ear-y: 0px; {ease}",
        f"{lp(t_asleep):.4f}":  f"--ear-y: {sy};",
        f"{lp(t_waking):.4f}":  f"--ear-y: {sy}; {ease}",
        "100.0000":             "--ear-y: 0px;",
    }
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join(["@keyframes pants-ear-y-loop {",
                      *[f"  {p}% {{ {d} }}" for p, d in sorted_pts],
                      "}"])


def ear_flick_keyframes():
    lines = ["@keyframes ear-flick {"]
    for i, (l, r) in enumerate(zip(EAR_FLICK_L, EAR_FLICK_R)):
        p = i * 20
        lines.append(f"  {p}%   {{ background-image: {url(l)}, {url(r)}; animation-timing-function: step-end; }}")
    lines.append(f"  100% {{ background-image: {awake_ear_imgs}; }}")
    lines.append("}")
    return "\n".join(lines)


print("Building keyframes…")
kf_rest_appear = rest_appear_keyframes()
kf_head_loop   = head_loop_keyframes()
kf_ear_random  = ear_random_keyframes()
kf_ear_y_loop  = ear_y_loop_keyframes()
kf_ear_flick   = ear_flick_keyframes()

SIZE         = f"{W} {H}"
RPT          = "no-repeat"
LOOP_DELAY   = APPEAR_SECONDS
loop_spec    = f"{LOOP_CYCLE}s steps(1) infinite {LOOP_DELAY}s"
loop_smooth  = f"{LOOP_CYCLE}s linear infinite {LOOP_DELAY}s"
ear_spec     = f"{RANDOM_CYCLE}s steps(1) infinite {LOOP_DELAY}s"
appear_spec  = f"{APPEAR_SECONDS}s steps(1) 1 forwards"

css = "\n".join([
    f"/**",
    f" * Pants The Cat. Kitty-URLoaf CSS.",
    f" * Sky Vercauteren. All Rights Reserved.",
    f" * Authored August 2026",
    f" * Generated {date.today().isoformat()}",
    f" */",
    f"",
    f"/* Kitty URLoaf ~ userChrome.css */",
    f"/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */",
    f"",
    f'@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");',
    f'@namespace html url("http://www.w3.org/1999/xhtml");',
    f"",
    f"@property --ear-y {{",
    f"  syntax: '<length>';",
    f"  initial-value: 0px;",
    f"  inherits: true;",
    f"}}",
    f"@property --cat-y {{",
    f"  syntax: '<length>';",
    f"  initial-value: 0px;",
    f"  inherits: false;",
    f"}}",
    f"",
    f"/* Pants on nav-bar — appear once, then head loops {LOOP_CYCLE}s; ears twitch pseudo-randomly over {RANDOM_CYCLE}s */",
    f"",
    f"/* REST layer: cushion appear once, then body stays visible forever */",
    kf_rest_appear, "",
    f"/* HEAD layer loop: {HOLD_SECONDS}s awake → {TRANS_SECONDS}s fall → {HOLD_SECONDS}s asleep → {TRANS_SECONDS}s wake */",
    kf_head_loop, "",
    f"/* EAR layer: pseudo-random L/R twitches, seed={RANDOM_SEED}, {RANDOM_CYCLE}s cycle */",
    kf_ear_random, "",
    f"/* --ear-y loop: eases 0→{SLEEP_DROP}px during fall, back during wake */",
    kf_ear_y_loop, "",
    f"/* ear-flick: hover/click override — both ears, holds last frame */",
    kf_ear_flick, "",
    f"/* stacking: toolbox above browser; nav-bar above tab bar */",
    f"#navigator-toolbox {{ position: relative !important; z-index: 9999 !important; overflow: visible !important; }}",
    f"#TabsToolbar       {{ position: relative !important; z-index: 1    !important; }}",
    f"",
    f"/* titlebar-spacer elements swallow mousedown for window dragging — release them so #nav-bar:active fires */",
    f"#nav-bar .titlebar-spacer, #vertical-spacer {{ -moz-window-dragging: no-drag !important; }}",
    f"",
    f"#nav-bar {{",
    f"  position:          relative;",
    f"  overflow:          visible !important;",
    f"  z-index:           2 !important;",
    f"  --cat-y:           -{Y_SHIFT}px;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"  animation:         pants-rest-appear {appear_spec}, pants-ear-y-loop {loop_smooth};",
    f"  min-height:        {px(C_H + PT_H)} !important;",
    f"  align-items:       flex-end !important;",
    f"  transition:        min-height 0.3s ease, padding-bottom 0.3s ease;",
    f"}}",
    f"#taskbar-tabs-favicon {{ position: absolute !important; inset: 0 !important; }}",
    f"#nav-bar-customization-target {{ position: relative !important; z-index: 1 !important; }}",
    f"",
    f"/* ::before = head layer; ::after = ear layer */",
    f"#nav-bar::before,",
    f"#nav-bar::after {{",
    f"  content:           '';",
    f"  position:          absolute;",
    f"  top:               -{Y_SHIFT}px;",
    f"  left:              0;",
    f"  right:             0;",
    f"  bottom:            0;",
    f"  overflow:          visible;",
    f"  pointer-events:    none;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"}}",
    f"",
    f"/* ::after inherits --ear-y; translateY snaps ear box to sleep position */",
    f"#nav-bar::after {{",
    f"  transform: translateY(var(--ear-y, 0px));",
    f"}}",
    f"",
    f"/* pants-ear-random in all ::after rules prevents animation restart on hover state change */",
    f"#nav-bar::after        {{ animation: pants-ear-random {ear_spec}; }}",
    f"#nav-bar:hover::after  {{ animation: pants-ear-random {ear_spec}, ear-flick 275ms 200ms linear 1 forwards; background-position: {POS}; }}",
    f"#nav-bar:has(:active)::after {{ animation: pants-ear-random {ear_spec}, ear-flick 275ms linear 1 forwards; background-position: {POS}; }}",
    f"#nav-bar::before       {{ animation: pants-head-loop {loop_spec}; }}",
    f"",
    f"#browser {{ overflow: visible !important; }}",
    f"#PersonalToolbar {{",
    f"  --cat-y:           -{Y_SHIFT + C_H}px;",
    f"  position:          relative;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"  animation:         pants-rest-appear {appear_spec};",
    f"}}",
    f"#navigator-toolbox:has(#PersonalToolbar:not([collapsed])) #nav-bar {{ min-height: {px(C_H)} !important; }}",
    f"",
])

OUT.write_text(css)
size_kb = OUT.stat().st_size // 1024
print(f"  {OUT.relative_to(ROOT)}  ({size_kb:,} KB  /  {size_kb // 1024} MB)")
print("\ndone.")
