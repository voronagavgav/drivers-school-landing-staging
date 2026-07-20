#!/bin/zsh
# MERGE: warm_soft's elevated near-ortho ISO camera (readable diagram) + warm_golden's GOLDEN warmth.
# Avoid the low-afternoon-sun cue that pulled warm_golden into a low cinematic angle: keep the sun HIGH,
# warm in tone, short soft shadows. Hammer the elevated near-orthographic iso camera so it stays a diagram.
cd ~/drivers-school

CAM="STRICT elevated isometric high three-quarter AERIAL view looking DOWN at roughly 40 degrees, near-orthographic projection with low perspective distortion, the WHOLE four-way intersection fully visible and readable at a glance like a clean top-down-ish diagram, buildings kept low so nothing occludes the scene, camera high above"

WARM="Lit by warm GOLDEN sunlight from high upper-left (sun kept fairly high, NOT a low late-afternoon sun), warm ~4800K white balance, warm cream-gold sky, gentle warm ambient bounce, SHORT soft natural shadows, sunny golden and inviting — NOT overcast, NOT flat grey, NOT cold, NOT long dramatic shadows"

MAT="REALISTIC physically-based materials (textured asphalt, real grass and foliage, realistic car paint with clearcoat, refined low building facades with real glass windows), high-end product-visualization realism, NOT toy, NOT clay, NOT plasticine, NOT low-poly; clean and uncluttered, a few elements with generous spacing; sparing road-sign blue, lane amber and signal green accents; crisp sharp detail, octane/redshift quality; no words or letters on signs; 1:1, no watermark"

SCENE="Photorealistic premium 3D render of a clean four-way road intersection filling the entire frame edge to edge, realistic textured asphalt and crisp lane markings, neat realistic grass verges with a few realistic trees, a small blue car at the intersection, a realistic traffic light and blue/amber road signs, one tidy low modern building."

: > .content-import/style_links_merge.txt
gen () {
  node .content-import/gen_demo_image.mjs "$2" "$1" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/$1.png" https://catbox.moe/user/api.php)
  echo "$1 -> $url" | tee -a .content-import/style_links_merge.txt
}

gen merge_a "$SCENE $CAM. $WARM. $MAT" &
gen merge_b "$SCENE $CAM. $WARM. $MAT" &
wait
echo DONE
