#!/bin/zsh
cd ~/drivers-school
BASE="Premium Apple-keynote 3D render of a tidy four-way road intersection with a small car, a traffic light and two road signs and crosswalks, matte soft-touch finish, rounded chamfered edges, elevated isometric high three-quarter aerial camera, near-orthographic, subject large and centered, soft large key light from upper-left, low contrast, soft contact shadows, no chrome, no glare, clean minimal premium toy-realistic, instantly readable"
TAIL="no words or letters on signs, high detail, 1:1, no watermark"
typeset -A styles
styles[warm_cream]="$BASE, on a soft graduated WARM CREAM / soft-sand studio background (not gray, not white), neutral scene with road-sign blue and lane amber accents"
styles[soft_sky]="$BASE, on a soft graduated pale SKY-BLUE studio background, slate-gray car with warm amber and signal-green accents (no blue signs so the background does not compete)"
styles[colorful_world]="$BASE, on a soft light neutral background, but a more COLORFUL world: a road-sign-blue car, green grass and low trees at the corners, amber and blue signs, a small soft-colored building"
styles[pastel_mint]="$BASE, on a soft graduated pale MINT-GREEN studio background, calm pastel palette, slate car with amber and blue accents and a touch of green landscaping"
styles[duotone_soft]="$BASE, on a soft two-tone gradient background blending pale blue into warm cream, colorful but soft scene with a blue car, green landscaping and amber signs"
: > .content-import/style_links_color.txt
for name in warm_cream soft_sky colorful_world pastel_mint duotone_soft; do
  echo "--- $name ---"
  node .content-import/gen_demo_image.mjs "${styles[$name]}, $TAIL" "color_$name" max 2>&1 | tail -1
  url=$(curl -s --max-time 40 -F "reqtype=fileupload" -F "fileToUpload=@public/demo-images/color_$name.png" https://catbox.moe/user/api.php)
  echo "$name -> $url" | tee -a .content-import/style_links_color.txt
done
echo DONE
