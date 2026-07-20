#!/bin/zsh
cd ~/drivers-school
BASE="Ultra-clean premium 3D render, Apple keynote product-visualization style, soft studio softbox lighting, seamless soft gradient background, refined glossy-and-matte materials, subtle reflections and ambient occlusion, shallow depth of field, minimal, elegant, very high detail, octane render"
TAIL="centered, no text, no watermark"
typeset -A styles
styles[car_hero]="$BASE. Subject: a small modern rounded electric city car in soft blue, three-quarter hero angle on a seamless light-gray studio background"
styles[intersection]="$BASE. Subject: a minimal tidy city intersection with a small car, a traffic light and two road signs, slightly elevated angle, seamless off-white background"
styles[trafficlight]="$BASE. Subject: a single modern traffic light, glossy dark housing with glowing red, amber and green lenses, on a seamless soft-gray background"
styles[diorama]="$BASE. Subject: a small car, traffic light and road signs on a soft rounded floating platform with a subtle cobalt-blue tint, miniature world, seamless background"
styles[car_neutral]="$BASE. Subject: a small modern car on a clean white pedestal, monochrome white-and-silver with a single amber-yellow accent, seamless white studio background, product hero shot"
: > .content-import/style_links5.txt
for name in car_hero intersection trafficlight diorama car_neutral; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "${styles[$name]}, $TAIL" "premium_$name" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/premium_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links5.txt
done
echo "=== TOTAL spend so far ==="; awk '{s+=$3} END {print s" credits ($"s*0.01")"}' .content-import/bfl_spend.log
