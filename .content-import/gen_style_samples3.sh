#!/bin/zsh
cd ~/drivers-school
TAIL="centered composition, clean, high quality, no text, no watermark"
typeset -A styles
styles[lowpoly_studio]="Low-poly 3D render of a small car at a tidy city intersection with a traffic light and road signs. Faceted geometric polygons, smooth matte materials, soft three-point studio lighting with gentle ambient occlusion, cohesive palette of cobalt blue, warm amber-yellow and slate gray, clean off-white background, Blender Cycles look"
styles[lowpoly_iso_diorama]="Isometric low-poly 3D diorama of a city street corner: a small car, a traffic light and road signs on a floating rounded base. Faceted polygons, soft pastel-and-cobalt palette with amber accents, soft long shadows, even studio light, 2.5D, minimal and tidy"
styles[lowpoly_goldenhour]="Low-poly 3D render of a small car at a city intersection at golden hour. Faceted geometry, warm cinematic side lighting, soft gradients, cobalt-blue and amber palette, gentle bloom, atmospheric, beautiful, Blender"
styles[lowpoly_vibrant]="Richly detailed low-poly 3D illustration of a busy little intersection with a car, traffic light, signs and tiny trees. Crisp faceted polygons, vibrant saturated colors led by blue and yellow, bright soft studio lighting, playful miniature world"
styles[soft3d_spline]="Soft 3D render in the Spline web-design style of a cute rounded car at a traffic light. Glossy inflated shapes, smooth vivid gradients from blue to indigo with yellow accents, big soft shadows, bright studio lighting, playful and modern"
styles[celshaded_toon]="Stylized cel-shaded 3D illustration of a friendly driver in a small car at a traffic light. Clean toon shading with crisp dark outlines, animated-feature-film quality, bright cobalt and amber palette, soft rim lighting"
styles[papercraft]="Layered paper-craft 3D scene of a city intersection with a car, traffic light and signs. Stacked cut-paper shapes with realistic soft drop shadows, tactile handmade texture, cobalt blue, amber and green paper, soft daylight, diorama"
styles[flat_iso_onbrand]="Isometric flat vector illustration of a road intersection with a small car, traffic light and signs. Precise 2.5D geometry, limited palette of road-sign blue, lane yellow and signal green with slate on off-white, subtle long shadows, clean minimal infographic"
: > .content-import/style_links3.txt
for name in lowpoly_studio lowpoly_iso_diorama lowpoly_goldenhour lowpoly_vibrant soft3d_spline celshaded_toon papercraft flat_iso_onbrand; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "${styles[$name]}, $TAIL" "style3_$name" max 2>&1 | tail -2
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/style3_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links3.txt
done
echo "=== spend this batch ==="; awk '{s+=$3} END {print s" credits ($"s*0.01")"}' .content-import/bfl_spend.log
echo "=== DONE ==="
