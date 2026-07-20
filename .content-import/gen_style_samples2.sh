#!/bin/zsh
cd ~/drivers-school
SCENE="a young driver in a small car at a city street intersection with a traffic light and road signs, daytime"
TAIL="high quality, no text, no watermark"
typeset -A styles
styles[iso_vibrant]="vibrant detailed isometric 3D illustration, miniature city diorama, rich colorful, clean studio lighting, soft shadows, playful detailed props, 2.5D"
styles[iso_brand]="clean isometric vector illustration, limited brand palette of road-sign blue and golden yellow with dark slate accents on a white background, minimal precise geometry, subtle long shadows, 2.5D"
styles[iso_neon_tech]="isometric 3D illustration on a dark navy background, glowing neon blue and yellow accents, sleek techy futuristic HUD aesthetic, subtle grid floor, 2.5D"
styles[lowpoly_3d]="low-poly 3D render, faceted geometric polygons, modern minimal, soft gradient studio lighting, blue and yellow palette"
styles[papercut]="layered paper-cut craft illustration, stacked colored construction paper with soft realistic drop shadows, tactile handmade diorama, blue yellow and green palette"
styles[blueprint]="technical blueprint schematic illustration, thin cyan and white lines on a deep blue background, precise engineering drawing aesthetic, faint grid"
: > .content-import/style_links2.txt
for name in iso_vibrant iso_brand iso_neon_tech lowpoly_3d papercut blueprint; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "$SCENE, ${styles[$name]}, $TAIL" "style2_$name" pro 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/style2_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links2.txt
done
echo "=== DONE ==="
