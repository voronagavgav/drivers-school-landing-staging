#!/bin/zsh
cd ~/drivers-school
SCENE="a young driver smiling inside a small car at a city street intersection, a traffic light and two road signs in the background, daytime"
TAIL="high quality, no text, no watermark"
typeset -A styles
styles[flat_onbrand]="flat 2D vector illustration, bold geometric shapes, limited palette of road-sign blue, road-marking yellow, signal green and dark slate on a light cool-gray background, clean minimal, crisp flat edges"
styles[corporate_memphis]="modern flat corporate-memphis / Alegria illustration style, simple rounded stylized characters, flat bold shapes with pastel fills and blue and yellow accents, playful trendy SaaS landing illustration"
styles[soft_3d]="soft 3D claymorphism render, rounded forms, gentle soft shadows, matte clay materials, friendly and toy-like, pastel palette with blue and yellow accents"
styles[isometric]="clean isometric 2.5D illustration, precise geometric instructional look, blue and yellow accents, subtle soft shadows, white background"
styles[duotone_line]="minimal duotone line-art illustration, only two colors deep blue and golden yellow on off-white, elegant thin linework, lots of negative space, editorial"
: > .content-import/style_links.txt
for name in flat_onbrand corporate_memphis soft_3d isometric duotone_line; do
  echo "--- generating $name ---"
  node .content-import/gen_demo_image.mjs "$SCENE, ${styles[$name]}, $TAIL" "style_$name" pro 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/style_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links.txt
done
echo "=== DONE ==="
