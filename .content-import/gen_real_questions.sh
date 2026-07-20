#!/bin/zsh
# Render REAL ПДР question scenes in the LOCKED style (STYLE.md / merge_b recipe) to see how it holds up
# on actual scenario content. Each {SUBJECT} = a real question situation; wrapper = the locked template.
cd ~/drivers-school

WRAP_PRE="Photorealistic premium 3D render of"
WRAP_POST="filling the entire frame edge to edge as a continuous little world. STRICT elevated isometric high three-quarter AERIAL view looking down ~40 degrees, near-orthographic projection with low perspective distortion, the whole scene fully visible and readable at a glance like a clean top-down-ish diagram, buildings kept low so nothing occludes. Lit by warm GOLDEN sunlight from high upper-left (sun kept fairly high, NOT a low late-afternoon sun), warm ~4800K white balance, warm cream-gold sky, gentle warm ambient bounce, short soft natural shadows — sunny golden and inviting, NOT overcast, NOT flat grey, NOT cold. REALISTIC physically-based materials (textured asphalt, real grass and foliage, realistic car paint with clearcoat, refined low building facades with real glass windows), high-end product-visualization realism, NOT toy, NOT clay, NOT plasticine, NOT low-poly. Clean and uncluttered with generous spacing; crisp white lane markings and road arrows; sparing road-sign blue, lane amber and signal green accents; crisp sharp detail, octane/redshift quality. No rendered words or letters on any sign — leave sign faces blank. 1:1, no watermark."

: > .content-import/style_links_questions.txt
gen () { # name  subject
  node .content-import/gen_demo_image.mjs "$WRAP_PRE $2, $WRAP_POST" "$1" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/$1.png" https://catbox.moe/user/api.php)
  echo "$1 -> $url" | tee -a .content-import/style_links_questions.txt
}

gen q_unreg_intersection "a four-way unmarked intersection of two equal-width streets with NO traffic lights and NO priority signs, a blue car approaching the center from the bottom road and a separate silver car approaching from the right road, both close to the junction — a give-way priority situation" &

gen q_left_turn "a four-way intersection where a blue car in the foreground is turning left (a curved white arrow on the asphalt shows its left-turn path) while an oncoming silver car drives straight toward the junction from the opposite side" &

gen q_ped_crossing "a city street with a marked white zebra pedestrian crossing, one blue car stopped just before the zebra, and a pedestrian walking across the zebra, a pedestrian-crossing sign on a post with a blank face" &

gen q_roundabout "a roundabout traffic circle with a round central island of grass and a tree, curved lane arrows painted around the circle, one blue car entering the roundabout and one silver car already circulating" &

wait
echo DONE
