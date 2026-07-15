# Firefox Extension Dev Requirements

## Manifest version
- Use `manifest.firefox.json` (MV2) — load this file when installing via `about:debugging`
- MV3 `background.service_worker` is disabled by default in Firefox; MV3 support is partial and behind flags even in Firefox 128+
- Use `web-ext build --config=manifest.firefox.json` to package for Firefox

## Required fields (MV2)
- [ ] `manifest_version: 2`
- [ ] `browser_specific_settings.gecko.id` — required for AMO; format: `name@domain.com`
- [ ] `browser_specific_settings.gecko.strict_min_version` — set to `"109.0"` or higher
- [ ] `name`, `version`, `description`

## Background
- [ ] `"background": { "scripts": [...], "persistent": false }` — non-persistent (event page)
- [ ] Do NOT use `background.service_worker` — Firefox disables it unless MV3 flag is on
- [ ] Use `const action = chrome.action ?? chrome.browserAction` for cross-browser compat

## Actions / toolbar
- [ ] MV2 uses `browser_action`, not `action`
- [ ] SVG icons are supported in Firefox (not all Chrome APIs accept SVG)

## Sidebar
- [ ] Firefox uses `sidebar_action` (not Chrome's `side_panel`)
- [ ] `sidebar_action.default_panel` — the HTML page
- [ ] No JS API needed — Firefox adds a toolbar button automatically; user clicks to open
- [ ] `sidePanel` permission does NOT exist in Firefox — omit it

## Web accessible resources
- [ ] MV2 format: `"web_accessible_resources": ["static/plus.svg"]` — plain array, no `matches`

## Permissions
- [ ] `contextMenus` — works (also aliased as `menus`)
- [ ] `storage` — works
- [ ] `notifications` — works
- [ ] `omnibox` — declared via `"omnibox": { "keyword": "..." }`, not under permissions

## Other supported APIs
- [ ] `chrome_url_overrides.newtab` — supported
- [ ] `devtools_page` — supported
- [ ] `options_ui` — supported
- [ ] `omnibox` — supported

## Testing (temporary install)
- [ ] Go to `about:debugging` > This Firefox > Load Temporary Add-on
- [ ] Select `manifest.firefox.json` directly (Firefox lets you pick the manifest file)
- [ ] For live reload: `web-ext run --config=manifest.firefox.json`

## AMO submission
- [ ] Firefox account required (free)
- [ ] All JS must be reviewable — minified code requires source upload
- [ ] Self-distributed XPI: sign via AMO as "unlisted" to skip review queue
- [ ] Store listing: name, summary ≤250 chars, icon, screenshots
