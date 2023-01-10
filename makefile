PDF_JS_VERSION = 3.1.81
ROOT_DIR := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
DIST = pdfjs-${PDF_JS_VERSION}-legacy-dist
THIRD_DIR = third

.PHONY: install INKSCAPE-exists

help: ## Show this help.
	@grep -E -h '\s##\s' $(MAKEFILE_LIST) |\
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m  %-30s\033[0m %s\n", $$1, $$2}'

third:
	mkdir -p $@

third/${DIST}.zip: | third
	wget 'https://github.com/mozilla/pdf.js/releases/download/v${PDF_JS_VERSION}/${DIST}.zip' -P ${THIRD_DIR}

third/${DIST}: third/${DIST}.zip
	unzip -qq $< -d $@
	sed -i.bak 's/\.\.\/web\/cmaps\//https:\/\/mozilla.github.io\/pdf.js\/web\/cmaps\//g' $@/web/viewer.js

third/${DIST}/web/py_control.js: ${ROOT_DIR}/pdfjs/py_control.js | third/${DIST}
	ln -s $< $@

~/.config/PDFJSViewer.toml: PDFJSViewer.toml
	cp -n $< ~/.config/
	echo pdfjs = \"${ROOT_DIR}/third/${DIST}\" >> $@

third/${DIST}/logo.svg:
	wget 'https://mozilla.github.io/pdf.js/images/logo.svg' -O $@

INKSCAPE-exists: ; @which inkscape > /dev/null

third/${DIST}/logo.png: third/${DIST}/logo.svg | INKSCAPE-exists
	inkscape $< -o $@ -d 384;

install: third/${DIST}/web/py_control.js third/${DIST}/logo.png ## install
