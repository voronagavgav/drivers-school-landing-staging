#!/bin/zsh
# Round: close the gap real_clean (realistic materials, but COLD/flat light) vs
# colorful_world (warm cream, but toy/clay). Goal = realistic PBR + WARM soft daylight.
cd ~/drivers-school

# Shared: realistic materials + clean readable composition + elevated iso (keep real_clean's strengths)
T="elevated isometric high three-quarter aerial camera, near-orthographic projection so the whole scene reads clearly at a glance; REALISTIC physically-based materials (textured asphalt, real grass and foliage, realistic car paint with clearcoat, refined building facades with real glass windows), high-end product-visualization realism, NOT toy, NOT clay, NOT plasticine, NOT low-poly; clean and uncluttered, a few elements with generous spacing, instantly readable like a diagram; sparing road-sign blue, lane amber and signal green accents; crisp sharp detail, octane/redshift quality; no words or letters on signs; 1:1, no watermark"

# Two warmth treatments (the variable we're isolating)
GOLDEN="Lit by warm late-afternoon golden sunlight from the upper-left, warm ~4800K white balance, soft natural shadows, a warm cream-gold sky, gentle warm ambient bounce, sunny and inviting — NOT overcast, NOT flat grey, NOT cold."
SOFTWARM="Lit by soft warm daylight, warm ~5200K white balance, warm off-white cream sky and warm ambient fill light, soft gentle shadows, bright and airy, low contrast but clearly WARM in tone — NOT cold, NOT grey, NOT overcast."

: > .content-import/style_links_warm.txt

gen () { # name  prompt
  node .content-import/gen_demo_image.mjs "$2" "$1" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/$1.png" https://catbox.moe/user/api.php)
  echo "$1 -> $url" | tee -a .content-import/style_links_warm.txt
}

# 1) clean intersection, GOLDEN warm light
gen warm_golden "Photorealistic premium 3D render of a clean four-way road intersection filling the entire frame edge to edge, realistic textured asphalt and crisp lane markings, neat realistic grass verges with a few realistic trees, a small blue car at the intersection, a realistic traffic light and blue/amber road signs, one tidy modern building. $GOLDEN $T" &

# 2) clean intersection, SOFT-WARM daylight
gen warm_soft "Photorealistic premium 3D render of a clean four-way road intersection filling the entire frame edge to edge, realistic textured asphalt and crisp lane markings, neat realistic grass verges with a few realistic trees, a small blue car at the intersection, a realistic traffic light and blue/amber road signs, one tidy modern building. $SOFTWARM $T" &

# 3) single-object HERO in the warm-realistic style (confirm the object line, not just scenes)
gen warm_hero "Photorealistic premium 3D product render of a single realistic traffic light on a brushed-metal pole, centered, gentle eye-level three-quarter view, the green lamp softly lit and emissive, sitting on a small patch of realistic asphalt with a hint of grass, warm cream studio backdrop. $SOFTWARM $T" &

wait
echo DONE
