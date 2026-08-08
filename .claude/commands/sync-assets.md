Pull updated assets from Google Drive, check what changed, crop to spec, and rebuild all animations.

## Steps

1. **Pull from Drive** — run `python3 .claude/pull-drive.py --no-rebuild` and capture output. If it exits non-zero, report the error and stop.

2. **Check results** — run `git status static/Pants` and `git diff --stat static/Pants` to see what actually changed (new files, modified files). Report a short summary: how many files added/changed, which directories were affected.

3. **Crop** — run `bash .claude/crop-pants.sh` and report how many files were cropped vs skipped.

4. **Rebuild animations** — run `bash .claude/generate-anims.sh` and report each APNG size.

5. **Summary** — one short paragraph: what changed from Drive, what got cropped, what was rebuilt.

If any step fails, stop immediately and report the error output verbatim.
