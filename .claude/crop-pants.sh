#!/usr/bin/env bash
# Crops Pants asset PNGs to remove shared whitespace padding.
# Safe to re-run — skips any file not at the original 4400x4400 canvas size.
#
# Crop amounts (from original 4400x4400):
#   left:   1400px  →  x offset 1400
#   top:    1000px  →  y offset 1000
#   bottom:  750px  →  final height 4400 - 1000 -  750 = 2650
#   right:  none    →  final width  4400 - 1400       = 3000
#
# Result: 3000x2650 per image.
# (height increased from 2200 to capture full tail flick at peak)

PANTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/static/Pants"
CROP="3000x2650+1400+1000"
ORIG_W=4400
ORIG_H=4400
COUNT_CROPPED=0
COUNT_SKIPPED=0

while IFS= read -r -d '' file; do
  dims=$(identify -format "%wx%h" "$file" 2>/dev/null)
  w="${dims%%x*}"
  h="${dims##*x}"
  if [[ "$w" == "$ORIG_W" && "$h" == "$ORIG_H" ]]; then
    convert "$file" -crop "$CROP" +repage "$file"
    echo "cropped: $file"
    (( COUNT_CROPPED++ ))
  else
    echo "skipped (${dims}): $file"
    (( COUNT_SKIPPED++ ))
  fi
done < <(find "$PANTS_DIR" -name "*.png" -print0)

echo ""
echo "done — cropped: $COUNT_CROPPED  skipped: $COUNT_SKIPPED"
