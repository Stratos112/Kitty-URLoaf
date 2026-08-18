## RULES:
1.) Use minimal tokens, optimize tasks for efficient use of tokens. 
2.) Avoid reading large files, and if you do, compress the summary for context next time you need to read through. NOTE this does not apply to our active files, only to documentation, specs, node_modules or external resources. 
3.) Avoid comments in code unless absolutely necessary. IF you find comments that where already there, leave them in. 
4.) If you find yourself repeating a task for the third time, ask me about making it into a skill. 
5.) Think outside the box. Be creative. I like irregular suggestions and ideas.

## USER CONTEXT:
Sky is a solo indie dev. Prefers dependency-free, minimal solutions.

## PROJECT: Kitty URLoaf

### What it is
Firefox extension. Animated cat in the browser chrome. Two editions:
- **Simple** — pure CSS baked into `userChrome.css`. No JS in the browser chrome. Cat is static at open, loops animations.
- **Deluxe** — driven by `userChrome.js`. Full JS state machine, entrance/exit/walk animations, cursor-following eyes, reactive behaviour, location hopping. Sidebar panel is the cat's "home" in deluxe mode.

### Active files (always safe to read fully)
- `.claude/generate-css.py` — builds CSS templates (Simple edition)
- `src/popup/popup.html` + `src/popup/popup.js` — install wizard
- `src/sidepanel/sidepanel.html` + `src/sidepanel/sidepanel.js` — deluxe home panel (also testing scaffold)
- `src/pants/inject.js` + `src/pants/pants.css` — deluxe DOM scaffold (8-layer cat structure)
- `manifest.json` — base manifest, Firefox only (gecko)

### Key constants (generate-css.py)
- `APPEAR_SECONDS = 1.0` — delay before CSS loops start
- `LOOP_CYCLE = 23s` — awake→sleep→awake head loop
- `RANDOM_CYCLE = 90s` — ear twitch cycle
- `WARMUP_HEAD_START_S = 7.0` — hidden head transition warmup (preloads APNGs)
- `PRELOAD_OFFSET = 300px` — how far below visible area the warmup renders
- `W, H = "364px", "266px"` — background-size for CSS backgrounds
- `SIDEBAR_W = "254px"` — sidebar element min-width
- `NAV_Y_SHIFT = 30` — px cat overflows above nav-bar top edge
- `SIDEBAR_TOP = "10px"` — top offset of cat within sidebar element
- Nav X position: `left 31px` (shifted left from original 91px to trim whitespace)
- Sidebar X position: `left -60px` (shifted left, 30px transparent edge bleeds off)

### CSS template design (Simple)
Three background-image layers on two pseudo-elements:
- Element → REST layer (cushion, body, paws, tail) — static `background-image` set directly in CSS
- `::before` → HEAD layer: `background-image` set statically + `pants-head-loop` animation (23s)
- `::after` → EAR layer: `background-image` set statically + `pants-ear-random` animation (90s)
- Plus `pants-ear-y-loop` on element for ear drop during sleep, `pants-head-warmup` at 7s (hidden)
- Placeholder token format: `PANTS_URI:Anim/tail-flick.apng` (relative to `static/Pants/`)

### CSS template output
- `static/userChrome-navbar.css` — nav bar variant (~25KB template)
- `static/userChrome-sidebar.css` — sidebar variant (~25KB template)
- At generate time popup.js fetches all 51 assets, base64-encodes, replaces tokens → ~70-80MB self-contained file

### pants.css layer system (Deluxe)
- `#pants` — zero-size `position: fixed` master anchor
- `.pants-{part}` — zero-size `position: absolute` anchors, all at `(0,0)`, z-indexed 1–8
- `::before` on each — actual image layer, `width/height: var(--pants-w/h)`
- Parts: paw-bl(1), paw-fl(2), body(3), paw-br(4), paw-fr(5), tail(6), head(7), eyes(8)
- All assets share a common canvas origin — JS sets `background-image` per frame

### Popup wizard pages
0. Edition select (keep it simple / deluxe kitty cards + location toggle inside simple card)
1. Generate/download
2–4. Install steps (Firefox profile chrome folder + about:config)
5. Done

### What "home" means
The sidebar panel (`src/sidepanel/`) is the cat's home in Deluxe mode. Rich HTML animation (layered divs), cursor-following, interactive. Not rendered in Simple mode (sidebar_action is in manifest but sidepanel should show placeholder in Simple).

### Deluxe implementation phases

**Phase 1 — foundation (no new assets)**
1. Jungle gym CSS + JS boot: `static/userChrome-deluxe.js` template (CSS inlined as string). Popup generates `userChrome.js`. State machine boots, sets idle assets via `--pants-img` custom props.
2. Sidebar home placeholder: Simple sidepanel shows "deluxe only" card; Deluxe sidepanel is the interactive hub (HTML layered divs, same 8-part system).

**Phase 2 — movement (assets exist)**
- Cushion appear APNG (10 frames: `Accessories/Cushion appear/`) + doorway/exit (38 frames: `Accessories/Exit_appear/`)
- Cat walk frames TBD (still need to be drawn)
- States: `ENTERING` → `IDLE` → `EXITING` → `RELOCATING` → `ENTERING` (new location)
- Entrance: cushion appear → doorway open → cat walks in → lies down
- Exit: cat stands → walks out → doorway close → cushion disappear

**Phase 3 — interactive (cursor/reactive)**
- Cursor-following eyes (8-directional assets in `Head/Eyes/look/`: eyes_n/ne/e/se/s/sw/w/nw)
- Reactive: scroll burst → ear flick, typing → glance, click near cat → startle
- Blink animation (`Anim/EarFlick/` + blink assets)

**Core runtime (userChrome.js)**
- Requires a userChrome.js loader (fx-autoconfig or equivalent) — the Deluxe "extra step"
- `#pants` injected via JS into browser chrome DOM
- CSS inlined as `<style>` by the driver script
- Per-part background controlled via `el.style.setProperty('--pants-img', url)`
- `#pants::before` = cushion/scene layer controlled via `--pants-scene` on root

### Removing sidepanel from Simple
The sidebar_action in manifest currently always loads the sidepanel. For Simple users, sidepanel.html should show a "this is a deluxe feature" placeholder. The full interactive sidepanel is only active in Deluxe.
