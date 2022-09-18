var _mark_positions = [0, 0, 0, 0, 0]; // from MarkShortcut

function inverse_search_click(event) {
    var pageNumber = PDFViewerApplication.page
    var x0, y0;
    const pageCount = PDFViewerApplication.pagesCount
    var page_el;
    while ((pageNumber > 0) && (pageNumber <= pageCount)) {
        page_el = document.getElementById('viewer').children[pageNumber - 1];
        const rect = page_el.children[0].getBoundingClientRect();
        if (event.clientX == null || event.clientX < rect.left) {
            return;
        }
        if (event.clientY < rect.top) {
            pageNumber -= 1;
            continue;
        }
        if (event.clientY > rect.bottom) {
            pageNumber += 1;
            continue;
        }
        x0 = event.clientX - rect.left;
        y0 = event.clientY - rect.top;
        break;
    }
    if ((pageNumber <= 0) || (pageNumber > pageCount)) {
        return;
    }
    const height = parseInt(page_el.style.height.slice(0, -2));
    const width = parseInt(page_el.style.width.slice(0, -2));
    PDFViewerApplication.pdfDocument.getPage(pageNumber).then(
        function(page) {
            const x = x0 / width * page.view[2];
            const y = y0 / height * page.view[3];
            new QWebChannel(qt.webChannelTransport,
                function(channel) {
                    channel.objects.inverse_search.do(pageNumber, x, y);
                }
            );
        }
    );
}

class LinkLayer {
    constructor(char_list) {
        const pageNumber = PDFViewerApplication.page
        const page_el = document.getElementById('viewer').children[pageNumber - 1]
        const links = page_el.getElementsByClassName('linkAnnotation');
        this.link_layer = {};
        if (links.length == 0) {
            this.clear();
            this.turn_off();
            return;
        }

        var al_el = page_el.getElementsByClassName('annotationLayer')[0];
        var char_num = Array(Math.ceil(
            Math.max(1,
                Math.log(links.length) / Math.log(char_list.length)
            )
        )).fill(0);
        for (let i = 0; i < links.length; i++) {
            var iDiv = document.createElement('div');
            iDiv.style.left = links[i].style.left;
            iDiv.style.top = links[i].style.top;
            iDiv.classList.add("link_tag");
            let tag = char_num.map(x => char_list[x]).join('');
            iDiv.innerHTML = `<span class="clicked" id="clicked"></span> ${tag}`;
            al_el.prepend(iDiv);
            this.link_layer[tag] = [iDiv, links[i].children[0]];
            char_num[char_num.length - 1] += 1;
            for (let i = char_num.length - 1; i >= 0; i--) {
                if (char_num[i] >= char_list.length) {
                    char_num[i - 1] += 1
                    char_num[i] = 0;
                } else {
                    break;
                }
            }
        }
    }

    clear() {
        for (var key in this.link_layer) {
            this.link_layer[key][0].remove();
        }
        this.link_layer = {};
    }

    turn_off() {
        new QWebChannel(qt.webChannelTransport,
            function(channel) {
                channel.objects.link_shortcut.reset();
            }
        );
    }

    click(key) {
        if (key in this.link_layer) {
            this.link_layer[key][1].click();
            this.turn_off();
            return true;
        }
        for (var k in this.link_layer) {
            let link = this.link_layer[k];
            if (k.startsWith(key)) {
                link[0].querySelector("#clicked").innerText = key;
                link[0].childNodes[1].textContent = k.slice(key.length);
            } else {
                link[0].remove()
                delete this.link_layer[k];
            }
        }
        return false;
    }
}

function toggle_PresentationMode() {
    if (!PDFViewerApplication.pdfViewer.isInPresentationMode) {
        PDFViewerApplication.requestPresentationMode();
    } else {
        new QWebChannel(qt.webChannelTransport,
            function(channel) {
                channel.objects.presentation_shortcut.reset();
            }
        );
    }
}

window.removeEventListener("keydown", window.eventListenerList.keydown[1].listener)
