#!/bin/zsh
cd ~/drivers-school
TAIL="centered composition, clean, high quality, no text, no watermark"
typeset -A styles
styles[A_flat_iso_brand]="Isometric flat vector illustration of a clean road intersection with a small car, traffic light, a couple of road signs and trees. Precise 2.5D geometry, crisp flat shapes, limited palette of deep road-sign blue, golden amber-yellow, signal green and dark slate on a soft off-white background, subtle long flat shadows, modern infographic, tidy"
styles[B_flat_iso_depth]="Isometric illustration of a road intersection with a small car, traffic light, signs and trees. Flat shapes with subtle soft drop shadows and gentle shading for light depth, semi-3D. Deep cobalt road-sign blue, amber-yellow, signal green and slate on off-white, clean and modern"
styles[C_iso_lowpoly_brand]="Isometric low-poly 3D diorama of a road intersection: a small car, traffic light, road signs and low-poly trees on a rounded square base. Faceted geometry, smooth matte materials, soft studio lighting, cohesive palette of cobalt-blue road, amber-yellow accents, signal-green grass and slate, soft long shadows, tidy and premium"
styles[D_iso_lowpoly_minimal]="Minimal isometric low-poly 3D diorama of an intersection on a rounded base with a small car, traffic light and signs. Clean faceted forms, mostly soft off-white and slate with cobalt-blue and a touch of amber-yellow accents, soft even studio light, elegant, calm negative space"
styles[E_lowpoly_studio_brand]="Low-poly 3D render of a small car at a tidy intersection with a traffic light and road signs, three-quarter slightly elevated view. Faceted polygons, matte materials, soft studio lighting, palette of cobalt-blue, amber-yellow and slate on a clean off-white background, gentle ambient occlusion"
styles[F_iso_lowpoly_detailed]="Detailed isometric low-poly 3D diorama of a city intersection with a car, traffic light, several road signs, crosswalks, trees and a small building on a rounded base. Faceted geometry, vibrant but cohesive palette led by cobalt-blue and amber-yellow with signal-green and slate, bright soft studio light, playful premium miniature"
: > .content-import/style_links4.txt
for name in A_flat_iso_brand B_flat_iso_depth C_iso_lowpoly_brand D_iso_lowpoly_minimal E_lowpoly_studio_brand F_iso_lowpoly_detailed; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "${styles[$name]}, $TAIL" "style4_$name" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/style4_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links4.txt
done
echo "=== batch spend ==="; awk '{s+=$3} END {print s" credits ($"s*0.01")"}' .content-import/bfl_spend.log
