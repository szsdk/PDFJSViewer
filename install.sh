dist=third/pdfjs-2.16.105-legacy-dist
PWD=`pwd`

mkdir third
wget 'https://github.com/mozilla/pdf.js/releases/download/v2.16.105/pdfjs-2.16.105-legacy-dist.zip' -P third
unzip third/pdfjs-2.16.105-legacy-dist.zip -d ${dist}
rm ${dist}/web/viewer.html
ln -s ${PWD}/pdfjs/viewer.html ${dist}/web/viewer.html
rm ${dist}/web/viewer.js
ln -s ${PWD}/pdfjs/viewer.js ${dist}/web/viewer.js

