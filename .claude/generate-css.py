#!/usr/bin/env python3
"""Pre-build userChrome.css and userChrome-sidebar.css with all assets inlined as data URIs.
userChrome.css lives in the Firefox profile and cannot reference extension
files, so everything must be self-contained.

Three-layer design (shared across locations):
  element background-image  → REST layer (cushion/body/paws/tail)
  element::before            → HEAD layer (head/eyes — awake/asleep with transitions)
  element::after             → EAR layer (pseudo-random L/R twitches)

Animation cycle (shared):
  One-time appear (APPEAR_SECONDS): cushion APNG plays, then body/head/ears snap in.
  Head loop (LOOP_CYCLE = 23s): awake → falling → asleep → waking → repeat
  Ear loop (RANDOM_CYCLE = 90s): pseudo-random L/R twitches, seeded for reproducibility

Outputs:
  static/userChrome.css         — nav-bar location (NW corner)
  static/userChrome-sidebar.css — sidebar location
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

OUT_NAV     = ROOT / "static" / "userChrome.css"
OUT_SIDEBAR = ROOT / "static" / "userChrome-sidebar.css"

def data_uri(path: Path) -> str:
    mime = "image/apng" if path.suffix == ".apng" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

# ---------------------------------------------------------------------------
# Shared animation constants
# ---------------------------------------------------------------------------

HOLD_SECONDS      = 10
APNG_MS           = 1500  # cushion-appear.apng duration
PRELOAD_S         = 2.5  # preload flash duration — forces browser to decode all assets
CUSH_START_S      = 2.0   # when cushion APNG begins
CUSH_SWAP_S       = CUSH_START_S + APNG_MS / 1000  # 3.5s — APNG → cushion_base
APPEAR_SECONDS    = 5.0   # when full cat appears
TRANS_SECONDS     = 1.5
TRANS_FRAME_COUNT = 30
SLEEP_DROP        = 35        # px ear drops during sleep
C_H               = 166       # cat canvas height
PT_H              = 34        # PersonalToolbar height (nav-bar only)
W, H              = "364px", "266px"

LOOP_CYCLE = HOLD_SECONDS * 2 + TRANS_SECONDS * 2  # 23s
t_falling  = float(HOLD_SECONDS)
t_asleep   = t_falling + TRANS_SECONDS
t_waking   = t_asleep  + HOLD_SECONDS

RANDOM_CYCLE = 90.0
RANDOM_SEED  = 10
MIN_GAP      = 10.0
MAX_GAP      = 28.0

# ---------------------------------------------------------------------------
# Nav-bar layout
# ---------------------------------------------------------------------------

NAV_EL      = "#nav-bar"
NAV_Y_SHIFT = 30              # px cat overflows above nav-bar top edge
NAV_POS     = "left 91px top 0px"
NAV_APP_POS = "left 91px top var(--cat-y)"  # appear uses --cat-y for PersonalToolbar dual-use

# ---------------------------------------------------------------------------
# Sidebar layout
# ---------------------------------------------------------------------------

SIDEBAR_EL  = ":is(#sidebar-container, html|sidebar-main)"
SIDEBAR_TOP = "200px"         # top offset within sidebar element — adjust to taste
SIDEBAR_APP_POS = "left 0px top 200px"   # REST layer on element, matches SIDEBAR_TOP
SIDEBAR_POS     = "left 0px top 0px"     # HEAD/EAR layers on pseudo-elements (already offset)

# ---------------------------------------------------------------------------
# Asset paths
# ---------------------------------------------------------------------------

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
CUSH_APPEAR_PATH  = ANIM / "cushion-appear.apng"
AWAKE_HEAD_PATHS = [
    ANIM / "blink-overlay.apng",
    ANIM / "breath-eyes.apng",
    ANIM / "breath-head.apng",
]
SLEEP_HEAD_PATHS = [
    ANIM / "breath-eyes-sleep.apng",
    ANIM / "breath-head-sleep.apng",
]
AWAKE_EAR_PATHS   = [ANIM / "breath-ear-L.apng", ANIM / "breath-ear-R.apng"]
TRANS_FRAME_PATHS = [ANIM / "Transition" / f"frame-{i:02d}.png" for i in range(TRANS_FRAME_COUNT)]
EAR_FLICK_DIR     = ANIM / "EarFlick"
EAR_FLICK_SEQ     = ["01", "02", "03", "02", "01"]
EAR_FLICK_L       = [EAR_FLICK_DIR / f"L_{n}.png" for n in EAR_FLICK_SEQ]
EAR_FLICK_R       = [EAR_FLICK_DIR / f"R_{n}.png" for n in EAR_FLICK_SEQ]

FRAME_COUNT = len(EAR_FLICK_SEQ)
FLICK_SECS  = 0.275
FRAME_SECS  = FLICK_SECS / FRAME_COUNT

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
def lp(t):    return t / LOOP_CYCLE * 100
def px(n):    return f"{n:.2f}px"

rest_imgs       = imgs(REST_PATHS)
awake_head_imgs = imgs(AWAKE_HEAD_PATHS)
sleep_head_imgs = imgs(SLEEP_HEAD_PATHS)
awake_ear_imgs  = imgs(AWAKE_EAR_PATHS)
trans_urls      = [url(p) for p in TRANS_FRAME_PATHS]

all_main_preload = ", ".join([url(CUSH_APPEAR_PATH), rest_imgs])
_flick_unique    = list(dict.fromkeys([*EAR_FLICK_L, *EAR_FLICK_R]))
all_ear_preload  = ", ".join([awake_ear_imgs, *[url(p) for p in _flick_unique]])

SIZE         = f"{W} {H}"
RPT          = "no-repeat"
loop_spec    = f"{LOOP_CYCLE}s steps(1) infinite {APPEAR_SECONDS}s"
loop_smooth  = f"{LOOP_CYCLE}s linear infinite {APPEAR_SECONDS}s"
ear_spec     = f"{RANDOM_CYCLE}s steps(1) infinite {APPEAR_SECONDS}s"
appear_spec  = f"{APPEAR_SECONDS}s linear 1 forwards"


# ---------------------------------------------------------------------------
# Shared keyframe generators  (parameterized by pos)
# ---------------------------------------------------------------------------

def pct(t): return round(t / APPEAR_SECONDS * 100, 1)
def kf(bg, pos, last=False):
    atf = "" if last else " animation-timing-function: steps(1, end);"
    return f"background-image: {bg}; background-position: {pos};{atf}"


def rest_appear_keyframes(appear_pos):
    return "\n".join(["@keyframes pants-rest-appear {",
        f"  0%      {{ {kf(all_main_preload,                    appear_pos)} }}",
        f"  {pct(PRELOAD_S)}%  {{ {kf('none',                           appear_pos)} }}",
        f"  {pct(CUSH_START_S)}%  {{ {kf(url(CUSH_APPEAR_PATH),            appear_pos)} }}",
        f"  {pct(CUSH_SWAP_S)}%  {{ {kf(url(ACC / 'cushion_base.png'),     appear_pos)} }}",
        f"  100%    {{ {kf(rest_imgs,                          appear_pos, last=True)} }}",
        "}"])


def head_appear_keyframes(pos):
    frame_step = PRELOAD_S / TRANS_FRAME_COUNT
    lines = ["@keyframes pants-head-appear {"]
    for i, t_url in enumerate(trans_urls):
        p = round(i * frame_step / APPEAR_SECONDS * 100, 4)
        lines.append(f"  {p}% {{ background-image: {t_url}; background-position: {pos}; animation-timing-function: steps(1, end); }}")
    lines.append(f"  {pct(PRELOAD_S)}% {{ background-image: none; background-position: {pos}; animation-timing-function: steps(1, end); }}")
    lines.append(f"  100% {{ {kf(awake_head_imgs, pos, last=True)} }}")
    lines.append("}")
    return "\n".join(lines)


def ear_appear_keyframes(pos):
    return "\n".join(["@keyframes pants-ear-appear {",
        f"  0%      {{ {kf(all_ear_preload, pos)} }}",
        f"  {pct(PRELOAD_S)}%  {{ background-image: none; background-position: {pos}; animation-timing-function: steps(1, end); }}",
        f"  100%    {{ {kf(awake_ear_imgs, pos, last=True)} }}",
        "}"])


def head_loop_keyframes(pos):
    awake  = f"background-image: {awake_head_imgs}; background-position: {pos};"
    asleep = f"background-image: {sleep_head_imgs}; background-position: {pos};"
    span   = TRANS_SECONDS

    def trans(t_start, reverse=False):
        return [
            (f"{lp(t_start + span * i / TRANS_FRAME_COUNT):.4f}",
             f"background-image: {trans_urls[TRANS_FRAME_COUNT-1-i if reverse else i]}; background-position: {pos};")
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


def ear_random_keyframes(pos):
    awake  = f"background-image: {awake_ear_imgs}; background-position: {pos};"
    R_rest = url(EAR_FLICK_R[0])
    L_rest = url(EAR_FLICK_L[0])
    rng    = random.Random(RANDOM_SEED)
    pts    = [("0.0000", awake)]
    t = rng.uniform(MIN_GAP, MAX_GAP)
    while t + FLICK_SECS < RANDOM_CYCLE - MIN_GAP:
        side = rng.choice(('L', 'R'))
        for i in range(FRAME_COUNT):
            fp    = EAR_FLICK_L[i] if side == 'L' else EAR_FLICK_R[i]
            imgs2 = f"{url(fp)}, {R_rest}" if side == 'L' else f"{L_rest}, {url(fp)}"
            pts.append((f"{(t + i * FRAME_SECS) / RANDOM_CYCLE * 100:.4f}",
                        f"background-image: {imgs2}; background-position: {pos};"))
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
    return "\n".join(["@keyframes pants-ear-y-loop {",
                      *[f"  {p}% {{ {d} }}" for p, d in sorted(pts.items(), key=lambda x: float(x[0]))],
                      "}"])


def ear_flick_keyframes(pos):
    lines = ["@keyframes ear-flick {"]
    for i, (l, r) in enumerate(zip(EAR_FLICK_L, EAR_FLICK_R)):
        lines.append(f"  {i*20}%   {{ background-image: {url(l)}, {url(r)}; animation-timing-function: step-end; }}")
    lines.append(f"  100% {{ background-image: {awake_ear_imgs}; }}")
    lines.append("}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Shared CSS fragment builders
# ---------------------------------------------------------------------------

def css_header():
    return "\n".join([
        "/**",
        " * Pants The Cat. Kitty-URLoaf CSS.",
        " * Sky Vercauteren. All Rights Reserved.",
        " * Authored August 2026",
        f" * Generated {date.today().isoformat()}",
        " */",
        "",
        "/* Kitty URLoaf ~ userChrome.css */",
        "/* toolkit.legacyUserProfileCustomizations.stylesheets must be true in about:config */",
        "",
        '@namespace url("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul");',
        '@namespace html url("http://www.w3.org/1999/xhtml");',
    ])


def pseudo_base_rules(el, top):
    return "\n".join([
        f"/* ::before = cushion-appear then head; ::after = ear layer */",
        f"{el}::before,",
        f"{el}::after {{",
        f"  content:           '';",
        f"  position:          absolute;",
        f"  top:               {top};",
        f"  left:              0;",
        f"  right:             0;",
        f"  bottom:            0;",
        f"  overflow:          visible;",
        f"  pointer-events:    none;",
        f"  background-size:   {SIZE};",
        f"  background-repeat: {RPT};",
              f"}}",
        f"/* ::after inherits --ear-y; translateY snaps ear to sleep position */",
        f"{el}::after {{",
        f"  transform: translateY(var(--ear-y, 0px));",
        f"}}",
    ])


def ear_animation_rules(el, pos):
    ea = f"pants-ear-appear {appear_spec}"
    ha = f"pants-head-appear {appear_spec}"
    return "\n".join([
        f"/* appear listed first (lower priority); loops listed last (higher) so loops win when they start */",
        f"{el}::after              {{ animation: {ea}, pants-ear-random {ear_spec}; }}",
        f"{el}:hover::after        {{ animation: {ea}, pants-ear-random {ear_spec}, ear-flick 275ms 200ms linear 1 forwards; background-position: {pos}; }}",
        f"{el}:has(:active)::after {{ animation: {ea}, pants-ear-random {ear_spec}, ear-flick 275ms linear 1 forwards; background-position: {pos}; }}",
        f"{el}::before             {{ animation: {ha}, pants-head-loop {loop_spec}; }}",
    ])


# ---------------------------------------------------------------------------
# Location: nav-bar
# ---------------------------------------------------------------------------

def generate_nav_bar():
    print("Building nav-bar keyframes…")
    kfs = "\n\n".join([
        rest_appear_keyframes(NAV_APP_POS),
        head_appear_keyframes(NAV_POS),
        ear_appear_keyframes(NAV_POS),
        head_loop_keyframes(NAV_POS),
        ear_random_keyframes(NAV_POS),
        ear_y_loop_keyframes(),
        ear_flick_keyframes(NAV_POS),
    ])

    top = f"-{NAV_Y_SHIFT}px"
    el  = NAV_EL

    css = "\n".join([
        css_header(), "",
        "@property --ear-y {",
        "  syntax: '<length>';",
        "  initial-value: 0px;",
        "  inherits: true;",
        "}",
        "@property --cat-y {",
        "  syntax: '<length>';",
        "  initial-value: 0px;",
        "  inherits: false;",
        "}", "",
        f"/* Pants on nav-bar — {LOOP_CYCLE}s head loop, {RANDOM_CYCLE}s ear cycle */", "",
        kfs, "",
        "/* stacking: toolbox above browser; nav-bar above tab bar */",
        "#navigator-toolbox { position: relative !important; z-index: 9999 !important; overflow: visible !important; }",
        "#TabsToolbar       { position: relative !important; z-index: 1    !important; }", "",
        "/* titlebar-spacer swallows mousedown — release so #nav-bar:active fires */",
        "#nav-bar .titlebar-spacer, #vertical-spacer { -moz-window-dragging: no-drag !important; }", "",
        f"#nav-bar {{",
        f"  position:          relative;",
        f"  overflow:          visible !important;",
        f"  z-index:           2 !important;",
        f"  --cat-y:           -{NAV_Y_SHIFT}px;",
        f"  background-size:   {SIZE};",
        f"  background-repeat: {RPT};",
        f"  animation:         pants-rest-appear {appear_spec}, pants-ear-y-loop {loop_smooth};",
        f"  min-height:        {px(C_H + PT_H)} !important;",
        f"  align-items:       flex-end !important;",
        f"  transition:        min-height 0.3s ease, padding-bottom 0.3s ease;",
        f"}}",
        "#taskbar-tabs-favicon { position: absolute !important; inset: 0 !important; }",
        "#nav-bar-customization-target { position: relative !important; z-index: 1 !important; }", "",
        pseudo_base_rules(el, top), "",
        ear_animation_rules(el, NAV_POS), "",
        "#browser { overflow: visible !important; }",
        f"#PersonalToolbar {{",
        f"  --cat-y:           -{NAV_Y_SHIFT + C_H}px;",
        f"  position:          relative;",
        f"  background-size:   {SIZE};",
        f"  background-repeat: {RPT};",
        f"  animation:         pants-rest-appear {appear_spec};",
        f"}}",
        f"#navigator-toolbox:has(#PersonalToolbar:not([collapsed])) #nav-bar {{ min-height: {px(C_H)} !important; }}",
        "",
    ])

    OUT_NAV.write_text(css)
    kb = OUT_NAV.stat().st_size // 1024
    print(f"  {OUT_NAV.relative_to(ROOT)}  ({kb:,} KB  /  {kb // 1024} MB)")


# ---------------------------------------------------------------------------
# Location: sidebar
# ---------------------------------------------------------------------------

def generate_sidebar():
    print("Building sidebar keyframes…")
    kfs = "\n\n".join([
        rest_appear_keyframes(SIDEBAR_APP_POS),
        head_appear_keyframes(SIDEBAR_POS),
        ear_appear_keyframes(SIDEBAR_POS),
        head_loop_keyframes(SIDEBAR_POS),
        ear_random_keyframes(SIDEBAR_POS),
        ear_y_loop_keyframes(),
        ear_flick_keyframes(SIDEBAR_POS),
    ])

    el = SIDEBAR_EL

    css = "\n".join([
        css_header(), "",
        "@property --ear-y {",
        "  syntax: '<length>';",
        "  initial-value: 0px;",
        "  inherits: true;",
        "}", "",
        f"/* Pants in sidebar — {LOOP_CYCLE}s head loop, {RANDOM_CYCLE}s ear cycle */", "",
        kfs, "",
        f"{el} {{",
        f"  position:          relative !important;",
        f"  overflow:          visible !important;",
        f"  min-width:         {W} !important;",
        f"  background-size:   {SIZE};",
        f"  background-repeat: {RPT};",
        f"  animation:         pants-rest-appear {appear_spec}, pants-ear-y-loop {loop_smooth};",
        f"}}", "",
        pseudo_base_rules(el, SIDEBAR_TOP), "",
        ear_animation_rules(el, SIDEBAR_POS), "",
    ])

    OUT_SIDEBAR.write_text(css)
    kb = OUT_SIDEBAR.stat().st_size // 1024
    print(f"  {OUT_SIDEBAR.relative_to(ROOT)}  ({kb:,} KB  /  {kb // 1024} MB)")


# ---------------------------------------------------------------------------

generate_nav_bar()
generate_sidebar()
print("\ndone.")
