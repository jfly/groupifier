#!/bin/bash

echo "Building fonts"

declare -A font_files
font_files["Roboto-Regular.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Regular.ttf"
font_files["Roboto-Medium.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Medium.ttf"
font_files["Roboto-Italic.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-Italic.ttf"
font_files["Roboto-MediumItalic.ttf"]="https://github.com/google/fonts/raw/master/apache/roboto/Roboto-MediumItalic.ttf"
font_files["WenQuanYiZenHei.ttf"]="https://github.com/layerssss/wqy/raw/gh-pages/fonts/WenQuanYiZenHei.ttf"

target="$(pwd)/src/pdfs/vfs-fonts.js"
tmpdir=$(mktemp -d)
cd $tmpdir
for file in ${!font_files[@]}; do
	echo "- Downloading ${file}..."
	wget --quiet ${font_files[$file]}
done
echo "- Creating fonts bundle..."
(
	echo "export default {"
	for file in ${!font_files[@]}; do
		echo "  '${file}': '$(base64 -w 0 $file)',"
	done
	echo "};"
) > $target
echo "Created bundle at ${target}"
rm -rf $tmpdir
