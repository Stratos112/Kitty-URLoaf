#!/usr/bin/env python3
"""Pre-build userChrome.css with all assets inlined as data URIs.
userChrome.css lives in the Firefox profile and cannot reference extension
files, so everything must be self-contained.

Three-layer design:
  element background-image  → REST layer (cushion/body/paws/tail): simple show/hide
  element::before            → HEAD layer (head/eyes/transitions): per-frame
  element::after             → EAR layer (ear cycle + flick override): per-phase

Ear Y positioning:
  --ear-y is animated on the element and inherited by ::after.
  ::after applies transform: translateY(var(--ear-y)) so the entire ear box
  rides with the head during falling/waking transitions.  The same transform
  is active during :active::after ear-flick, so flick frames are always at
  the correct position without needing separate awake/sleep flick assets.

Output: static/userChrome.css
"""

import base64
from datetime import date
from pathlib import Path

ROOT  = Path(__file__).resolve().parent.parent
PANTS = ROOT / "static" / "Pants"
ANIM  = PANTS / "Anim"
TRANS = ANIM / "Transition"
LIMBS = PANTS / "Limbs"
BODY  = PANTS / "Body"
ACC   = PANTS / "Accessories"
OUT   = ROOT / "static" / "userChrome.css"

def data_uri(path: Path) -> str:
    mime = "image/apng" if path.suffix == ".apng" else "image/png"
    return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"

HOLD_SECONDS      = 10
TRANS_SECONDS     = 1.5
APPEAR_SECONDS    = 1.5
TRANS_FRAME_COUNT = 30
SLEEP_DROP        = 35        # CSS px — generate-anims uses 70px at 530px tall; CSS renders at 266px (×0.502 scale)
C_H               = 166
PT_H              = 34        # estimate of Firefox bookmarks toolbar natural height
W, H              = "364px", "266px"
IMG_H             = int(H.replace("px", ""))   # 266
Y_SHIFT           = 30                          # px above nav-bar pseudo-elements extend (cat shifted up)
Y_BELOW           = IMG_H - Y_SHIFT - C_H      # px below nav-bar pseudo-elements extend (cushion overflow)

# REST layer: cushion behind body/paws/tail — constant during all phases at a location
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

# HEAD layer: head/eyes — no ears (ears live on ::after)
AWAKE_HEAD_PATHS = [
    ANIM / "blink-overlay.apng",
    ANIM / "breath-eyes.apng",
    ANIM / "breath-head.apng",
]
SLEEP_HEAD_PATHS = [
    ANIM / "breath-eyes-sleep.apng",
    ANIM / "breath-head-sleep.apng",
]

# EAR layer: awake APNGs only — --ear-y transform handles sleep drop
AWAKE_EAR_PATHS   = [ANIM / "breath-ear-L.apng", ANIM / "breath-ear-R.apng"]
TRANS_FRAME_PATHS = [TRANS / f"frame-{i:02d}.png" for i in range(TRANS_FRAME_COUNT)]

CUSH_APPEAR_PATH = ANIM / "cushion-appear.apng"

EAR_FLICK_DIR = ANIM / "EarFlick"
EAR_FLICK_SEQ = ["01", "02", "03", "02", "01"]
EAR_FLICK_L   = [EAR_FLICK_DIR / f"L_{n}.png" for n in EAR_FLICK_SEQ]
EAR_FLICK_R   = [EAR_FLICK_DIR / f"R_{n}.png" for n in EAR_FLICK_SEQ]

print("Loading assets…")
all_paths = list(dict.fromkeys([
    CUSH_APPEAR_PATH,
    *REST_PATHS, *AWAKE_HEAD_PATHS, *SLEEP_HEAD_PATHS,
    *AWAKE_EAR_PATHS,
    *TRANS_FRAME_PATHS, *EAR_FLICK_L, *EAR_FLICK_R,
]))
uri = {p: data_uri(p) for p in all_paths}
print(f"  {len(uri)} files loaded")

def url(p):   return f'url("{uri[p]}")'
def imgs(ps): return ", ".join(url(p) for p in ps)

rest_imgs       = imgs(REST_PATHS)
awake_head_imgs = imgs(AWAKE_HEAD_PATHS)
sleep_head_imgs = imgs(SLEEP_HEAD_PATHS)
awake_ear_imgs  = imgs(AWAKE_EAR_PATHS)
trans_urls      = [url(p) for p in TRANS_FRAME_PATHS]

POS      = "left 91px top 0px"            # pseudo-element background (HEAD, EAR)

PHASE_KINDS = ["appear", "awake", "falling", "asleep", "waking", "awake"]

def seconds_for(kind):
    if kind == "appear":              return APPEAR_SECONDS
    if kind in ("falling", "waking"): return TRANS_SECONDS
    return HOLD_SECONDS

cursor = 0
TIMELINE = []
for kind in PHASE_KINDS:
    start = cursor
    cursor += seconds_for(kind)
    TIMELINE.append(dict(kind=kind, startSec=start, endSec=cursor))
CYCLE = cursor

def to_pct(s):  return s / CYCLE * 100
def px(n):      return f"{n:.2f}px"


def rest_keyframes():
    appear_ph   = next(ph for ph in TIMELINE if ph["kind"] == "appear")
    appear_pct  = to_pct(appear_ph["startSec"])
    pants_pct   = to_pct(appear_ph["endSec"])
    end_pct     = to_pct(TIMELINE[-1]["endSec"])
    cush_appear = f"background-image: {url(CUSH_APPEAR_PATH)}; background-position: left 91px top var(--cat-y);"
    show        = f"background-image: {rest_imgs}; background-position: left 91px top var(--cat-y);"
    hide        = "background-image: none;"
    pts = {}
    pts["0.0000"]              = cush_appear if appear_pct <= 0.0001 else hide
    pts["100.0000"]            = hide
    pts[f"{appear_pct:.4f}"]   = cush_appear
    pts[f"{pants_pct:.4f}"]    = show
    pts[f"{end_pct:.4f}"]      = hide
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join(["@keyframes pants-rest {",
                      *[f"  {p}% {{ {d} }}" for p, d in sorted_pts],
                      "}"])


def head_keyframes():
    head_by = {"awake": awake_head_imgs, "asleep": sleep_head_imgs}
    pts = []
    for ph in TIMELINE:
        if ph["kind"] == "appear":
            pts.append((f"{to_pct(ph['startSec']):.4f}", "background-image: none;"))
            continue
        if ph["kind"] in ("falling", "waking"):
            span = ph["endSec"] - ph["startSec"]
            for i in range(TRANS_FRAME_COUNT):
                fi = i if ph["kind"] == "falling" else (TRANS_FRAME_COUNT - 1 - i)
                t  = ph["startSec"] + span * i / TRANS_FRAME_COUNT
                pts.append((f"{to_pct(t):.4f}",
                             f"background-image: {trans_urls[fi]}; background-position: {POS};"))
        else:
            pts.append((f"{to_pct(ph['startSec']):.4f}",
                        f"background-image: {head_by[ph['kind']]}; background-position: {POS};"))
    pts.append(("100.0000", pts[0][1]))
    return "\n".join(["@keyframes pants-head {",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_keyframes():
    """Always awake ear APNGs during the location visit — no image swap for sleep.
    --ear-y (animated on the element, inherited by ::after) shifts the ear box
    down for the sleep pose so we never need separate sleep ear assets here."""
    show = f"background-image: {awake_ear_imgs}; background-position: {POS};"
    pts  = []
    for ph in TIMELINE:
        val = show if ph["kind"] != "appear" else "background-image: none;"
        pts.append((f"{to_pct(ph['startSec']):.4f}", val))
    pts.append(("100.0000", pts[0][1]))
    return "\n".join(["@keyframes pants-ear {",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_y_keyframes():
    """Animate --ear-y on the element so ::after's transform tracks the head.
    Eases 0 → SLEEP_DROP during falling, holds, eases back during waking.
    ::after inherits the value and applies transform: translateY(var(--ear-y)).
    :active::after overrides animation but not transform, so ear-flick frames
    ride the same Y offset automatically."""
    sleep_y = f"{SLEEP_DROP}px"
    ease    = "animation-timing-function: ease-in-out;"
    pts     = {"0.0000": "--ear-y: 0px;", "100.0000": "--ear-y: 0px;"}
    for ph in TIMELINE:
        p = f"{to_pct(ph['startSec']):.4f}"
        if   ph["kind"] == "falling": pts[p] = f"--ear-y: 0px; {ease}"
        elif ph["kind"] == "asleep":  pts[p] = f"--ear-y: {sleep_y};"
        elif ph["kind"] == "waking":  pts[p] = f"--ear-y: {sleep_y}; {ease}"
        elif ph["kind"] == "awake":   pts[p] = "--ear-y: 0px;"
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join(["@keyframes pants-ear-y {",
                      *[f"  {p}% {{ {d} }}" for p, d in sorted_pts],
                      "}"])


def ear_flick_keyframes():
    lines = ["@keyframes ear-flick {"]
    for i, (l, r) in enumerate(zip(EAR_FLICK_L, EAR_FLICK_R)):
        p = i * 20
        lines.append(f"  {p}%   {{ background-image: {url(l)}, {url(r)}; animation-timing-function: step-end; }}")
    lines.append(f"  100% {{ background-image: none; }}")
    lines.append("}")
    return "\n".join(lines)


print("Building keyframes…")
kf_ear_flick = ear_flick_keyframes()
kf_rest  = rest_keyframes()
kf_head  = head_keyframes()
kf_ear   = ear_keyframes()
kf_ear_y = ear_y_keyframes()

def anim(*names):      return ", ".join(f"{n} {CYCLE}s steps(1) infinite" for n in names)
def smooth_anim(name): return f"{name} {CYCLE}s linear infinite"

SIZE = f"{W} {H}"
RPT  = "no-repeat"

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
    f"/* Pants on nav-bar — {HOLD_SECONDS}s awake → {TRANS_SECONDS}s fall → {HOLD_SECONDS}s asleep → {TRANS_SECONDS}s wake */",
    f"",
    f"/* REST layer keyframes (cushion / body / paws / tail) */",
    kf_rest, "",
    f"/* HEAD layer keyframes (head / eyes / transition frames — no ears) */",
    kf_head, "",
    f"/* EAR layer keyframes (::after — awake ears only; --ear-y handles sleep drop) */",
    kf_ear, "",
    f"/* EAR Y keyframes (--ear-y on element; eases with head during transitions) */",
    kf_ear_y, "",
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
    f"  animation:         {anim('pants-rest')}, {smooth_anim('pants-ear-y')};",
    f"  min-height:        {px(C_H + PT_H)} !important;",
    f"  align-items:       flex-end !important;",
    f"  transition:        min-height 0.3s ease, padding-bottom 0.3s ease;",
    f"}}",
    f"/* #taskbar-tabs-favicon is an HTML <img> stretched over the full nav-bar.",
    f"   ::before/::after have pointer-events:none so empty-area clicks fall through",
    f"   to the favicon, which reliably sets :active (HTML element, no XUL quirks).",
    f"   #nav-bar:has(#taskbar-tabs-favicon:active) catches those without needing",
    f"   XUL :active propagation. */",
    f"#taskbar-tabs-favicon {{ position: absolute !important; inset: 0 !important; }}",
    f"/* Toolbar row (buttons + urlbar) must sit above the favicon click layer */",
    f"#nav-bar-customization-target {{ position: relative !important; z-index: 1 !important; }}",
    f"",
    f"/* ::before = head layer; ::after = ear layer */",
    f"/* extend beyond nav-bar so the full image is unclipped above and below */",
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
    f"/* ::after inherits --ear-y from parent; translateY shifts the whole ear box */",
    f"/* clicks pass through ::after (pointer-events:none) to #taskbar-tabs-favicon below */",
    f"#nav-bar::after {{",
    f"  transform: translateY(var(--ear-y, 0px));",
    f"}}",
    f"",
    kf_ear_flick,
    f"/* #taskbar-tabs-favicon is an HTML <img> — reliably gets :active on click.",
    f"   :has() on the XUL ancestor reads the child :active without XUL :active propagation issues.",
    f"   Also keep :active fallback for button/urlbar clicks that propagate normally. */",
    f"#nav-bar:has(#taskbar-tabs-favicon:active)::after,",
    f"#nav-bar:has(:active)::after {{ animation: ear-flick 275ms linear 1 forwards; background-position: {POS}; }}",
    f"#nav-bar::after        {{ animation: {anim('pants-ear')}; }}",
    f"#nav-bar::before       {{ animation: {anim('pants-head')}; }}",
    f"",
    f"#browser {{ overflow: visible !important; }}",
    f"#PersonalToolbar {{",
    f"  --cat-y:           -{Y_SHIFT + C_H}px;",
    f"  position:          relative;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"  animation:         {anim('pants-rest')};",
    f"}}",
    f"#navigator-toolbox:has(#PersonalToolbar:not([collapsed])) #nav-bar {{ min-height: {px(C_H)} !important; }}",
    f"",
    f"/* === DEBUG: remove before shipping === */",
    f"#taskbar-tabs-favicon {{ background: rgba(255,0,0,0.25) !important; cursor: crosshair !important; }}",
    f"#taskbar-tabs-favicon:active {{ background: rgba(0,255,0,0.6) !important; }}",
    f"#nav-bar:has(#taskbar-tabs-favicon:active) {{ outline: 4px solid blue !important; }}",
])

OUT.write_text(css)
size_kb = OUT.stat().st_size // 1024
print(f"  {OUT.relative_to(ROOT)}  ({size_kb:,} KB  /  {size_kb // 1024} MB)")
print("\ndone.")
