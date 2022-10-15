#!/usr/bin/env bash

dist=third/pdfjs-2.16.105-legacy-dist
PWD=`pwd`

mkdir third
wget 'https://github.com/mozilla/pdf.js/releases/download/v2.16.105/pdfjs-2.16.105-legacy-dist.zip' -P third
unzip -qq third/pdfjs-2.16.105-legacy-dist.zip -d ${dist}
ln -s ${PWD}/pdfjs/py_control.js ${dist}/web/py_control.js

# When loading CJK files, pdf.js needs extra cmaps files which cannot be easily fetched due to some 
# browser security issues. Replace the relative cmaps URL with an online official cmaps URL.
sed -i.bak 's/\.\.\/web\/cmaps\//https:\/\/mozilla.github.io\/pdf.js\/web\/cmaps\//g' ${dist}/web/viewer.js
wget 'https://mozilla.github.io/pdf.js/images/logo.svg' -O ${dist}/logo.svg

if command -v inkscape &> /dev/null
then
    inkscape ${dist}/logo.svg -o ${dist}/logo.png -d 384
fi

if [ -f ~/.config/PDFJSViewer.toml ]; 
then
    echo "~/.config/PDPDFJSViewer.toml exists."
else
    cp -n PDFJSViewer.toml ~/.config/
    echo pdfjs = \"`pwd`/${dist}\" >> ~/.config/PDFJSViewer.toml
fi
