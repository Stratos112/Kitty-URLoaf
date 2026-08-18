# Kitty URLoaf
A Firefox browser extension that puts an animated cat in your browser chrome.  
All Rights Reserved. Sky Vercauteren. August 2026.

---

## Editions

### Keep It Simple (CSS-only)
A self-contained `userChrome.css` that bakes all animation into Firefox's native chrome layer.  
No scripts. No runtime overhead. The cat is just there.

- Cat appears immediately on browser open (no entrance animation)
- Head sleep/wake loop (23s cycle), random ear twitches (90s cycle)
- Periodic head warmup preload at ~7s (hidden below visible area, triggers APNG decode)
- Two placement variants: **nav bar** (top-left of toolbar) and **sidebar** (sidebar panel top)
- At install time, the popup wizard generates a self-contained CSS file by fetching all image assets from the extension package, converting them to base64 data URIs, and injecting them into the CSS template

### Deluxe Kitty (JS-driven)
A richer, living experience driven by `userChrome.js`. Requires one extra setup step at install.

**Behaviour goals:**
1. **Entrance** — Cushion appears (APNG), a doorway appears, the cat walks in and lies down
2. **Relocation** — Periodically stands up, plays an exit animation, walks out of frame. The cushion and doorway disappear. She reappears at a different browser location with a fresh entrance sequence.
3. **Home (sidebar panel)** — The sidebar content panel is the cat's permanent home ("home"). She can be summoned there from anywhere, or drift there on her own. In home mode the animation is rendered in HTML (layered divs, not CSS background tricks) and is significantly more interactive. Home is the only mode where cursor-following eyes, spontaneous reactions, and rich interaction are fully active.
4. **Reactive behaviour** — Follows cursor with eyes (home + when awake at a location), spontaneous animations triggered by user behaviour (fast scroll, lots of typing, clicking near her), ear twitches, yawns, stretch poses, brief curiosity reactions.

**Technical approach:**  
The deluxe CSS is an "empty jungle gym" — it defines the DOM structure and anchor positions but contains no animation. All animation is driven by JS: frame stepping, state machines, event listeners, eye offset calculations. No CSS keyframes.  
The extension generates both a `userChrome.css` (jungle gym skeleton) and a `userChrome.js` (the driver) at install time.

---

## Architecture

### Extension structure
```
src/
  popup/          wizard UI (edition select → generate → install steps)
  sidepanel/      "home" panel — used by Deluxe, placeholder in Simple
  pants/          inject.js + pants.css (deluxe JS layer scaffolding)
static/
  Pants/          all image assets (APNGs + PNGs, shared between both editions)
  icons/
  userChrome-navbar.css    simple template (nav bar variant)
  userChrome-sidebar.css   simple template (sidebar variant)
.claude/
  generate-css.py   builds the CSS templates (placeholder tokens, no base64)
  generate-anims.py
  pull-drive.py
```

### Generate flow (Simple)
1. `generate-css.py` outputs CSS templates with `PANTS_URI:path/to/asset` tokens instead of inline data URIs — templates are ~25KB each
2. User opens popup, selects edition + location, clicks **generate**
3. `popup.js → generate(css, bgColor)` fetches all 51 assets in parallel from the extension package, base64-encodes them, replaces all tokens → produces a fully self-contained `userChrome.css`
4. File is downloaded to the user's machine; they place it in their Firefox profile's `chrome/` folder

### CSS template design (Simple)
- Element `background-image` → REST layer (cushion, body, paws, tail)
- `::before` → HEAD layer (awake/sleep APNGs + 30-frame transition sequence)
- `::after` → EAR layer (pseudo-random L/R twitches seeded for reproducibility)
- `background-position` carries all layout — no extra DOM elements injected

### pants.css / inject.js (Deluxe scaffold)
- 8-layer DOM: `#pants` zero-size fixed anchor > `.pants-{part}` zero-size absolute anchors > `::before` image layers
- All parts share origin `(0,0)` — assets were drawn on a shared canvas and naturally overlap
- JS drives everything: sets `background-image`, `transform`, `opacity` per frame

---

## Roadmap

- [x] CSS-only animation (Simple) — nav bar + sidebar variants
- [x] Install wizard with edition + location select
- [x] At-generate-time URI injection (small shipped templates, runtime assembly)
- [x] Theme background color detection (`browser.theme.getCurrent()`)
- [ ] Deluxe Kitty: JS driver skeleton + jungle gym CSS
- [ ] Deluxe: entrance / exit / walk animations (new assets needed)
- [ ] Deluxe: eye cursor-follow
- [ ] Deluxe: reactive behaviour triggers (scroll, click, typing)
- [ ] Deluxe: location hopping
- [ ] Deluxe: home (sidebar) interactive mode
- [ ] User-configurable spawn location (both editions)
- [ ] Sidebar placeholder → "coming soon" screen for Simple installs

---

Version 0.1.0 — August 2026. Bump version in `manifest.json` when shipping; update the date in `generate-css.py`'s `css_header()`.
