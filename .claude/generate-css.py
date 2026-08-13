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
SLEEP_DROP        = 70        # px — must match generate-anims.py
C_H               = 286
SIDE_W            = 256
RAMP_SECONDS      = 2
RAMP_STEPS        = 48
W, H              = "364px", "266px"

# REST layer: cushion behind body/paws/tail — constant during all phases at a location
REST_PATHS = [
    ANIM  / "tail-flick.apng",
    ANIM  / "breath-rpaw.apng",
    LIMBS / "right_back_paw.png",
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

POS = {"d": "left bottom", "c": "left 142px center", "a": "right 170px center"}

LOCATIONS   = ["d", "c", "a"]
PHASE_KINDS = ["appear", "awake", "falling", "asleep", "waking", "awake"]

def seconds_for(kind):
    if kind == "appear":              return APPEAR_SECONDS
    if kind in ("falling", "waking"): return TRANS_SECONDS
    return HOLD_SECONDS

cursor = 0
TIMELINE = []
for loc in LOCATIONS:
    for kind in PHASE_KINDS:
        start = cursor
        cursor += seconds_for(kind)
        TIMELINE.append(dict(loc=loc, kind=kind, startSec=start, endSec=cursor))
CYCLE = cursor

def to_pct(s):  return s / CYCLE * 100
def pct(n):     return f"{(((n % 100) + 100) % 100):.4f}"
def px(n):      return f"{n:.2f}px"


def rest_keyframes(name, loc):
    visit       = [ph for ph in TIMELINE if ph["loc"] == loc]
    appear_ph   = next(ph for ph in visit if ph["kind"] == "appear")
    appear_pct  = to_pct(appear_ph["startSec"])
    pants_pct   = to_pct(appear_ph["endSec"])
    end_pct     = to_pct(visit[-1]["endSec"])
    cush_appear = f"background-image: {url(CUSH_APPEAR_PATH)}; background-position: {POS[loc]};"
    show        = f"background-image: {rest_imgs}; background-position: {POS[loc]};"
    hide        = "background-image: none;"
    pts = {}
    pts["0.0000"]              = cush_appear if appear_pct <= 0.0001 else hide
    pts["100.0000"]            = cush_appear if appear_pct <= 0.0001 else hide
    pts[f"{appear_pct:.4f}"]   = cush_appear
    pts[f"{pants_pct:.4f}"]    = show
    pts[f"{end_pct:.4f}"]      = hide
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join([f"@keyframes {name} {{",
                      *[f"  {p}% {{ {d} }}" for p, d in sorted_pts],
                      "}"])


def head_keyframes(name, loc):
    head_by = {"awake": awake_head_imgs, "asleep": sleep_head_imgs}
    pts = []
    for ph in TIMELINE:
        if ph["loc"] != loc or ph["kind"] == "appear":
            pts.append((f"{to_pct(ph['startSec']):.4f}", "background-image: none;"))
            continue
        if ph["kind"] in ("falling", "waking"):
            span = ph["endSec"] - ph["startSec"]
            for i in range(TRANS_FRAME_COUNT):
                fi = i if ph["kind"] == "falling" else (TRANS_FRAME_COUNT - 1 - i)
                t  = ph["startSec"] + span * i / TRANS_FRAME_COUNT
                pts.append((f"{to_pct(t):.4f}",
                             f"background-image: {trans_urls[fi]}; background-position: {POS[loc]};"))
        else:
            pts.append((f"{to_pct(ph['startSec']):.4f}",
                        f"background-image: {head_by[ph['kind']]}; background-position: {POS[loc]};"))
    pts.append(("100.0000", pts[0][1]))
    return "\n".join([f"@keyframes {name} {{",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ear_keyframes(name, loc):
    """Always awake ear APNGs during the location visit — no image swap for sleep.
    --ear-y (animated on the element, inherited by ::after) shifts the ear box
    down for the sleep pose so we never need separate sleep ear assets here."""
    show = f"background-image: {awake_ear_imgs}; background-position: {POS[loc]};"
    pts  = []
    for ph in TIMELINE:
        val = show if ph["loc"] == loc else "background-image: none;"
        pts.append((f"{to_pct(ph['startSec']):.4f}", val))
    pts.append(("100.0000", pts[0][1]))
    return "\n".join([f"@keyframes {name} {{",
                      *[f"  {p}% {{ {d} }}" for p, d in pts],
                      "}"])


def ease_in_out_cubic(t):
    return 4 * t**3 if t < 0.5 else 1 - (-2*t + 2)**3 / 2


def margin_keyframes(name, prop, loc, open_px):
    visit = [ph for ph in TIMELINE if ph["loc"] == loc]
    start = to_pct(visit[0]["startSec"])
    end   = to_pct(visit[-1]["endSec"])
    ramp  = RAMP_SECONDS / CYCLE * 100
    pts   = {}
    pts["0.0000"]   = px(open_px) if end   >= 99.9999 else px(0)
    pts["100.0000"] = px(open_px) if start <= 0.0001  else px(0)
    for s in range(1, RAMP_STEPS + 1):
        t = s / RAMP_STEPS
        pts[pct(start - ramp + ramp * t)] = px(open_px * ease_in_out_cubic(t))
        pts[pct(end   + ramp * t)]        = px(open_px * (1 - ease_in_out_cubic(t)))
    pts[f"{start:.4f}"] = px(open_px)
    pts[f"{end:.4f}"]   = px(open_px)
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join([f"@keyframes {name} {{",
                      *[f"  {p}% {{ {prop}: {v}; }}" for p, v in sorted_pts],
                      "}"])


def ear_y_keyframes(name, loc):
    """Animate --ear-y on the element so ::after's transform tracks the head.
    Eases 0 → SLEEP_DROP during falling, holds, eases back during waking.
    ::after inherits the value and applies transform: translateY(var(--ear-y)).
    :active::after overrides animation but not transform, so ear-flick frames
    ride the same Y offset automatically."""
    sleep_y = f"{SLEEP_DROP}px"
    ease    = "animation-timing-function: ease-in-out;"
    pts     = {"0.0000": "--ear-y: 0px;", "100.0000": "--ear-y: 0px;"}
    for ph in TIMELINE:
        if ph["loc"] != loc:
            continue
        p = f"{to_pct(ph['startSec']):.4f}"
        if   ph["kind"] == "falling": pts[p] = f"--ear-y: 0px; {ease}"
        elif ph["kind"] == "asleep":  pts[p] = f"--ear-y: {sleep_y};"
        elif ph["kind"] == "waking":  pts[p] = f"--ear-y: {sleep_y}; {ease}"
        elif ph["kind"] == "awake":   pts[p] = "--ear-y: 0px;"
    sorted_pts = sorted(pts.items(), key=lambda x: float(x[0]))
    return "\n".join([f"@keyframes {name} {{",
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
kf_d_rest  = rest_keyframes("pants-d-rest",  "d")
kf_c_rest  = rest_keyframes("pants-c-rest",  "c")
kf_a_rest  = rest_keyframes("pants-a-rest",  "a")
kf_d_head  = head_keyframes("pants-d-head",  "d")
kf_c_head  = head_keyframes("pants-c-head",  "c")
kf_a_head  = head_keyframes("pants-a-head",  "a")
kf_d_ear   = ear_keyframes( "pants-d-ear",   "d")
kf_c_ear   = ear_keyframes( "pants-c-ear",   "c")
kf_a_ear   = ear_keyframes( "pants-a-ear",   "a")
kf_d_ear_y = ear_y_keyframes("pants-d-ear-y","d")
kf_c_ear_y = ear_y_keyframes("pants-c-ear-y","c")
kf_a_ear_y = ear_y_keyframes("pants-a-ear-y","a")
kf_dm = margin_keyframes("pants-d-w", "--pants-sidebar-w", "d", SIDE_W)
kf_cm = margin_keyframes("pants-c-h", "--pants-c-h",       "c", C_H)
kf_am = margin_keyframes("pants-a-h", "--pants-a-h",       "a", C_H)

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
    f"/* --ear-y: animated on the element, inherited by ::after for transform */",
    f"@property --ear-y {{",
    f"  syntax: '<length>';",
    f"  initial-value: 0px;",
    f"  inherits: true;",
    f"}}",
    f"",
    f"/* one Pants, D → C → A, {HOLD_SECONDS}s awake → {TRANS_SECONDS}s fall → {HOLD_SECONDS}s asleep → {TRANS_SECONDS}s wake */",
    f"",
    f"/* REST layer keyframes (cushion / body / paws / tail — constant per visit) */",
    kf_d_rest, "", kf_c_rest, "", kf_a_rest, "",
    f"/* HEAD layer keyframes (head / eyes / transition frames — no ears) */",
    kf_d_head, "", kf_c_head, "", kf_a_head, "",
    f"/* EAR layer keyframes (::after — awake ears only; --ear-y handles sleep drop) */",
    kf_d_ear, "", kf_c_ear, "", kf_a_ear, "",
    f"/* EAR Y keyframes (--ear-y on element; eases with head during transitions) */",
    kf_d_ear_y, "", kf_c_ear_y, "", kf_a_ear_y, "",
    f"/* room-making margins */",
    kf_dm, "", kf_cm, "", kf_am, "",
    f"/* shared background geometry */",
    f"#sidebar-container, #nav-bar, #TabsToolbar {{",
    f"  position:          relative;",
    f"  overflow:          visible !important;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"}}",
    f"",
    f"/* ::before = head layer; ::after = ear layer (both share parent coordinate space) */",
    f"#sidebar-container::before, #nav-bar::before, #TabsToolbar::before,",
    f"#sidebar-container::after,  #nav-bar::after,  #TabsToolbar::after  {{",
    f"  content:           '';",
    f"  position:          absolute;",
    f"  inset:             0;",
    f"  overflow:          visible;",
    f"  pointer-events:    none;",
    f"  background-size:   {SIZE};",
    f"  background-repeat: {RPT};",
    f"}}",
    f"",
    f"/* ::after inherits --ear-y from parent; translateY shifts the whole ear box */",
    f"/* :active::after overrides animation but not transform — flick rides same Y */",
    f"#sidebar-container::after, #nav-bar::after, #TabsToolbar::after {{",
    f"  transform: translateY(var(--ear-y, 0px));",
    f"}}",
    f"",
    f"/* ear flick on :active — higher specificity overrides base ::after ear cycle */",
    kf_ear_flick,
    f"#sidebar-container:active::after {{ animation: ear-flick 275ms linear 1 forwards; background-position: {POS['d']}; }}",
    f"#nav-bar:active::after           {{ animation: ear-flick 275ms linear 1 forwards; background-position: {POS['c']}; }}",
    f"#TabsToolbar:active::after       {{ animation: ear-flick 275ms linear 1 forwards; background-position: {POS['a']}; }}",
    f"/* base ::after ear cycle — overridden by :active above */",
    f"#sidebar-container::after {{ animation: {anim('pants-d-ear')}; }}",
    f"#nav-bar::after           {{ animation: {anim('pants-c-ear')}; }}",
    f"#TabsToolbar::after       {{ animation: {anim('pants-a-ear')}; }}",
    f"",
    f"#browser {{ overflow: visible !important; }}",
    f"",
    f"/* ── D: sidebar icon strip ───────────────────────────────── */",
    f"#sidebar-container {{ animation: {anim('pants-d-rest')}, {smooth_anim('pants-d-ear-y')}; }}",
    f"#sidebar-container::before {{ animation: {anim('pants-d-head')}; }}",
    f"html|sidebar-main {{",
    f"  animation:  {anim('pants-d-w')};",
    f"  min-width:  var(--pants-sidebar-w, 0px) !important;",
    f"  max-width:  {px(SIDE_W)} !important;",
    f"}}",
    f"",
    f"/* ── C: nav-bar ─────────────────────────────────────────── */",
    f"#nav-bar {{",
    f"  animation:  {anim('pants-c-rest', 'pants-c-h')}, {smooth_anim('pants-c-ear-y')};",
    f"  min-height: var(--pants-c-h, 0px) !important;",
    f"}}",
    f"#nav-bar::before {{ animation: {anim('pants-c-head')}; }}",
    f"",
    f"/* ── A: TabsToolbar ─────────────────────────────────────── */",
    f"#TabsToolbar {{",
    f"  animation:  {anim('pants-a-rest', 'pants-a-h')}, {smooth_anim('pants-a-ear-y')};",
    f"  min-height: var(--pants-a-h, 0px) !important;",
    f"}}",
    f"#TabsToolbar::before {{ animation: {anim('pants-a-head')}; }}",
])

OUT.write_text(css)
size_kb = OUT.stat().st_size // 1024
print(f"  {OUT.relative_to(ROOT)}  ({size_kb:,} KB  /  {size_kb // 1024} MB)")
print("\ndone.")
