#!/bin/zsh
cd ~/drivers-school
PREM="Premium 3D render, Apple-keynote product visualization, soft studio softbox lighting, refined materials, subtle ambient occlusion, shallow depth of field, minimal, very high detail, octane render"
SCENE="a tidy road intersection with a small car, a traffic light and two road signs"
TAIL="clean, instantly readable, no text, no watermark"
typeset -A styles
# 6 recipe variants on the SAME question-scene (vary background / angle / finish / palette)
styles[R1_gray_iso_matte]="$PREM. $SCENE, slightly elevated isometric angle, soft MATTE materials, neutral light-gray scene with a single cobalt-blue and warm amber accent, seamless soft-gray gradient background"
styles[R2_white_iso_matte]="$PREM. $SCENE, slightly elevated isometric angle, soft matte materials, neutral whites with cobalt-blue and amber accents, seamless pure white background"
styles[R3_gray_3q_satin]="$PREM. $SCENE, three-quarter low hero angle, soft satin materials, neutral grays with cobalt-blue accent, seamless soft-gray gradient background"
styles[R4_bluetint_iso]="$PREM. $SCENE, elevated isometric angle, matte materials, cobalt-blue and amber accents, seamless very subtle cool-blue gradient background"
styles[R5_white_topdown]="$PREM. $SCENE, near top-down 60-degree angle for maximum layout clarity, soft matte, minimal neutral palette with one blue accent, seamless white background"
styles[R6_gray_iso_glossy]="$PREM. $SCENE, elevated isometric angle, glossier premium materials with soft reflections, neutral grays with cobalt-blue accent, seamless soft-gray gradient background"
# 2 object tests in the leading (gray+matte) recipe to check family coherence with the loved traffic light
styles[O1_sign_object]="$PREM. A single round blue road sign on a slim metal pole, soft matte finish, seamless soft-gray gradient background, slight elevated angle"
styles[O2_trafficlight]="$PREM. A single modern traffic light, soft matte dark housing with softly glowing red amber green lenses, seamless soft-gray gradient background, slight elevated angle"
: > .content-import/style_links_matrix.txt
for name in R1_gray_iso_matte R2_white_iso_matte R3_gray_3q_satin R4_bluetint_iso R5_white_topdown R6_gray_iso_glossy O1_sign_object O2_trafficlight; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "${styles[$name]}, $TAIL" "matrix_$name" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/matrix_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links_matrix.txt
done
echo "=== TOTAL spend ==="; awk '{s+=$3} END {print s" credits ($"s*0.01")"}' .content-import/bfl_spend.log
echo DONE
