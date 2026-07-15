# Firefox Extension Dev Requirements

## Manifest
- [ ] `manifest_version: 2` (MV3 supported but MV2 is still primary for AMO)
- [ ] `browser_specific_settings.gecko.id` set (e.g. `ext@domain.com`)
- [ ] `browser_specific_settings.gecko.strict_min_version` if using newer APIs

## Permissions
- [ ] Use `browser.*` APIs (or `chrome.*` via webextension-polyfill)
- [ ] `tabs` permission required for `tabs.query` with `url`
- [ ] Avoid `clipboardRead`/`clipboardWrite` unless essential (flagged in review)

## Background
- [ ] MV2: `"background": { "scripts": [...] }` (persistent optional)
- [ ] MV3: `"background": { "service_worker": "..." }` (Firefox 121+)
- [ ] Prefer non-persistent background for battery/performance

## Content Scripts
- [ ] `matches` uses valid match patterns
- [ ] `web_accessible_resources` declared for any injected assets

## Build / Packaging
- [ ] Zip extension root (not parent folder)
- [ ] Source code submission may be required if build tools used
- [ ] Include `source_code_url` or upload sources separately on AMO

## Firefox Add-on Submission (AMO)
- [ ] Firefox account required (free)
- [ ] All JS must be reviewable — no minified-only submissions without source
- [ ] Self-distributed XPI option available (bypasses AMO review for unlisted)
- [ ] Store listing: name, summary (250 chars), description, icon, screenshots

## Testing
- [ ] Load temporary add-on via `about:debugging` > This Firefox
- [ ] For permanent install: sign via AMO or use Firefox Developer Edition
- [ ] Test with `web-ext run` for live reload during development
