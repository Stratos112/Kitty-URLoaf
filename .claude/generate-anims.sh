#!/usr/bin/env bash
# Entry point for generating Pants idle animations.
# Delegates to generate-anims.py (requires Pillow: pip install Pillow).
exec python3 "$(dirname "$0")/generate-anims.py" "$@"
