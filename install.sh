#!/usr/bin/env bash

dist=third/pdfjs-2.16.105-legacy-dist
PWD=`pwd`

mkdir third
wget 'https://github.com/mozilla/pdf.js/releases/download/v2.16.105/pdfjs-2.16.105-legacy-dist.zip' -P third
unzip third/pdfjs-2.16.105-legacy-dist.zip -d ${dist}
ln -s ${PWD}/pdfjs/py_control.js ${dist}/web/py_control.js
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
    echo pdfjs = \"`pwd`/third/pdfjs-2.16.105-legacy-dist\" >> ~/.config/PDFJSViewer.toml
fi
