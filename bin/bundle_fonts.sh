#!/bin/bash

echo "Building fonts"

declare -A font_files
font_files["Roboto-Regular.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Regular.ttf"
font_files["Roboto-Medium.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Medium.ttf"
font_files["Roboto-Italic.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Italic.ttf"
font_files["Roboto-MediumItalic.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-MediumItalic.ttf"
font_files["WenQuanYiZenHei.ttf"]="https://github.com/layerssss/wqy/raw/gh-pages/fonts/WenQuanYiZenHei.ttf"
font_files["ElMessiri-Regular.ttf"]="https://github.com/Gue3bara/El-Messiri/raw/master/fonts/ttf/ElMessiri-Regular.ttf"

target="$(pwd)/src/pdfs/vfs-fonts.bundle.json"
tmpdir=$(mktemp -d)
cd $tmpdir
for file in ${!font_files[@]}; do
  echo "- Downloading ${file}..."
  wget --quiet ${font_files[$file]}
done
echo "- Creating fonts bundle..."
(
  echo "{"
	file_number=1
  for file in ${!font_files[@]}; do
    echo -n "  \"${file}\": \"$(base64 -w 0 $file)\""
    if [[ $file_number -ne ${#font_files[@]} ]]; then echo ","; else echo ""; fi
    ((file_number++))
  done
  echo "}"
) > $target
echo "Created bundle at ${target}"
rm -rf $tmpdir
