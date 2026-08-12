#!/usr/bin/env bash
# Entry point for generating Pants idle animations and userChrome.css.
# Requires Pillow: pip install Pillow
set -e
DIR="$(dirname "$0")"
python3 "$DIR/generate-anims.py" "$@"
python3 "$DIR/generate-css.py"
