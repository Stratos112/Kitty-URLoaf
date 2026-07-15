# Chrome Extension Dev Requirements

## Manifest
- [ ] `manifest_version: 3` (MV3 required for new submissions)
- [ ] `name`, `version`, `description` fields present
- [ ] Valid `icons` at 16, 48, 128px

## Permissions
- [ ] Declare only permissions actually used
- [ ] Use `host_permissions` for URL access (not `permissions`)
- [ ] Avoid broad host patterns (`<all_urls>`) unless necessary

## Service Worker (Background)
- [ ] Background script registered as `"service_worker"` in manifest
- [ ] No persistent background pages (MV3 restriction)
- [ ] Use `chrome.storage` not `localStorage` in service worker

## Content Scripts
- [ ] Registered under `content_scripts` with specific `matches`
- [ ] Avoid `run_at: document_start` unless required

## Build / Packaging
- [ ] Zip the extension root (not a parent folder)
- [ ] Remove `node_modules`, `.git`, source maps before zipping
- [ ] Max zip size: 10 MB (unzipped 512 MB)

## Chrome Web Store Submission
- [ ] Developer account ($5 one-time fee)
- [ ] Privacy policy URL if requesting sensitive permissions
- [ ] Store listing: description, screenshots (1280x800 or 640x400), promo images
- [ ] Single-purpose policy compliance
- [ ] No obfuscated code

## Testing
- [ ] Load unpacked via `chrome://extensions` (Developer mode on)
- [ ] Test on Chrome stable, beta if targeting both
