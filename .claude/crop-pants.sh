#!/usr/bin/env bash
# Crops Pants asset PNGs to remove shared whitespace padding.
# Safe to re-run — skips any file not at the original 4400x4400 canvas size.
#
# Crop amounts (from original 4400x4400):
#   left:    785px  →  x offset  785
#   top:    1000px  →  y offset 1000
#   bottom:  750px  →  final height 4400 - 1000 -  750 = 2650
#   right:  none    →  final width  4400 -  785       = 3615
#
# Result: 3615x2650 per image. Ratio 3615:2650 ≈ 15:11 (same as original 3000:2200).
# (width increased from 3000 to restore aspect ratio after height was expanded for tail flick)

PANTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/static/Pants"
CROP="3615x2650+785+1000"
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
