#!/usr/bin/env python3
"""Pre-build userChrome.css with all assets inlined as data URIs.
userChrome.css lives in the Firefox profile and cannot reference extension
files, so everything must be self-contained.

Three-layer design:
  element background-image  → REST layer (cushion/body/paws/tail)
  element::before            → HEAD layer (head/eyes — awake or asleep, no transitions)
  element::after             → EAR layer (ear cycle + hover flick override)

Ear Y positioning:
  --ear-y is animated on the element and inherited by ::after.
  ::after applies transform: translateY(var(--ear-y)) so the ear box snaps
  down for the sleep pose without needing separate sleep ear assets.

Animation cycle:
  One-time appear (APPEAR_SECONDS): cushion APNG plays, then body/head/ears snap in.
  Infinite loop (LOOP_CYCLE, delayed by APPEAR_SECONDS):
    awake (HOLD_SECONDS) → left ear flick (FLICK_SECS) → asleep (HOLD_SECONDS) → right ear flick → repeat
  Cat and cushion never re-appear after the initial intro.

Output: static/userChrome.css
"""

import base64
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

HOLD_SECONDS   = 10
APPEAR_SECONDS = 1.5
SLEEP_DROP     = 35        # px ear drops during sleep (::after translateY)
C_H            = 166
PT_H           = 34
W, H           = "364px", "266px"
IMG_H          = int(H.replace("px", ""))
Y_SHIFT        = 30
Y_BELOW        = IMG_H - Y_SHIFT - C_H

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
AWAKE_EAR_PATHS = [ANIM / "breath-ear-L.apng", ANIM / "breath-ear-R.apng"]

CUSH_APPEAR_PATH = ANIM / "cushion-appear.apng"

EAR_FLICK_DIR = ANIM / "EarFlick"
EAR_FLICK_SEQ = ["01", "02", "03", "02", "01"]
EAR_FLICK_L   = [EAR_FLICK_DIR / f"L_{n}.png" for n in EAR_FLICK_SEQ]
EAR_FLICK_R   = [EAR_FLICK_DIR / f"R_{n}.png" for n in EAR_FLICK_SEQ]

FRAME_COUNT = len(EAR_FLICK_SEQ)   # 5
FLICK_SECS  = 0.275
FRAME_SECS  = FLICK_SECS / FRAME_COUNT
LOOP_CYCLE  = HOLD_SECONDS * 2 + FLICK_SECS * 2  # 20.55s

t_left_flick  = float(HOLD_SECONDS)        # 10.0s  — left flick starts
t_asleep      = t_left_flick + FLICK_SECS  # 10.275s — asleep phase starts
t_right_flick = t_asleep + HOLD_SECONDS    # 20.275s — right flick starts

print("Loading assets…")
all_paths = list(dict.fromkeys([
    CUSH_APPEAR_PATH,
    *REST_PATHS, *AWAKE_HEAD_PATHS, *SLEEP_HEAD_PATHS,
    *AWAKE_EAR_PATHS,
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
    ap     = f"{lp(t_asleep):.4f}"
    return "\n".join(["@keyframes pants-head-loop {",
                      f"  0%      {{ {awake} }}",
                      f"  {ap}% {{ {asleep} }}",
                      f"  100%    {{ {awake} }}",
                      "}"])


def ear_loop_keyframes():
    awake  = f"background-image: {awake_ear_imgs}; background-position: {POS};"
    R_base = url(AWAKE_EAR_PATHS[1])
    L_base = url(AWAKE_EAR_PATHS[0])
    pts    = [("0.0000", awake)]
    for i, fp in enumerate(EAR_FLICK_L):
        t = t_left_flick + i * FRAME_SECS
        pts.append((f"{lp(t):.4f}", f"background-image: {url(fp)}, {R_base}; background-position: {POS};"))
    pts.append((f"{lp(t_asleep):.4f}", awake))
    for i, fp in enumerate(EAR_FLICK_R):
        t = t_right_flick + i * FRAME_SECS
        pts.append((f"{lp(t):.4f}", f"background-image: {L_base}, {url(fp)}; background-position: {POS};"))
    pts.append(("100.0000", awake))
    return "\n".join(["@keyframes pants-ear-loop {",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_y_loop_keyframes():
    ap = f"{lp(t_asleep):.4f}"
    return "\n".join(["@keyframes pants-ear-y-loop {",
                      f"  0%      {{ --ear-y: 0px; }}",
                      f"  {ap}% {{ --ear-y: {SLEEP_DROP}px; }}",
                      f"  100%    {{ --ear-y: 0px; }}",
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
kf_ear_loop    = ear_loop_keyframes()
kf_ear_y_loop  = ear_y_loop_keyframes()
kf_ear_flick   = ear_flick_keyframes()

SIZE      = f"{W} {H}"
RPT       = "no-repeat"
LOOP_DELAY = APPEAR_SECONDS
loop_spec  = f"{LOOP_CYCLE}s steps(1) infinite {LOOP_DELAY}s"
appear_spec = f"{APPEAR_SECONDS}s steps(1) 1 forwards"

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
    f"/* Pants on nav-bar — appear once, then loop: {HOLD_SECONDS}s awake → left flick → {HOLD_SECONDS}s asleep → right flick */",
    f"",
    f"/* REST layer: cushion appear once, then body stays visible forever */",
    kf_rest_appear, "",
    f"/* HEAD layer loop: awake ↔ asleep, snaps at {lp(t_asleep):.2f}% ({t_asleep}s) */",
    kf_head_loop, "",
    f"/* EAR layer loop: awake ears, left flick at {lp(t_left_flick):.2f}%, right flick at {lp(t_right_flick):.2f}% */",
    kf_ear_loop, "",
    f"/* --ear-y loop: snaps 0px→{SLEEP_DROP}px at {lp(t_asleep):.2f}% so ::after tracks head position */",
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
    f"  animation:         pants-rest-appear {appear_spec}, pants-ear-y-loop {loop_spec};",
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
    f"/* pants-ear-loop in all ::after rules prevents animation restart on hover state change */",
    f"#nav-bar::after        {{ animation: pants-ear-loop {loop_spec}; }}",
    f"#nav-bar:hover::after  {{ animation: pants-ear-loop {loop_spec}, ear-flick 275ms 200ms linear 1 forwards; background-position: {POS}; }}",
    f"#nav-bar:has(:active)::after {{ animation: pants-ear-loop {loop_spec}, ear-flick 275ms linear 1 forwards; background-position: {POS}; }}",
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
