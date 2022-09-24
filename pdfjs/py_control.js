function inverseSearchClick(event) {
    var pageNumber = PDFViewerApplication.page
    var x0, y0;
    const pageCount = PDFViewerApplication.pagesCount
    var page_el;
    while ((pageNumber > 0) && (pageNumber <= pageCount)) {
        page_el = PDFViewerApplication.pdfViewer.viewer.children[pageNumber - 1];
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

function rectsOverlap(rect1, rect2) {
    if (rect1.left > rect2.right) {
        return false;
    }
    if (rect2.left > rect1.right) {
        return false;
    }
    if (rect1.top > rect2.bottom) {
        return false;
    }
    if (rect2.top > rect1.bottom) {
        return false;
    }
    return true;
}

function addPageLinks(tagLinks, pageNumber) {
    const containerRect = PDFViewerApplication.pdfViewer.container.getBoundingClientRect();
    const page_el = PDFViewerApplication.pdfViewer.viewer.querySelector(`[aria-label="Page ${pageNumber}"]`);
    if (page_el == null) {
        return false;
    }
    const links = page_el.getElementsByClassName('linkAnnotation');
    const al_el = page_el.getElementsByClassName('annotationLayer')[0];
    if (links.length == 0) {
        return true
    };
    let flag = false;
    for (let link of links) {
        if (!rectsOverlap(link.getBoundingClientRect(), containerRect)) {
            continue;
        }
        tagLinks.push({
            pos: parseFloat(link.style.top) * 100 + parseFloat(link.style.left) + pageNumber * 10000,
            annotationLayer: al_el,
            link: link
        });
        flag = true;
    }
    return flag;
}

class LinkLayer {
    constructor(char_list) {
        const pageNumber = PDFViewerApplication.page
        var tagLinks = [];
        for (let i = pageNumber; i > 0; i--) {
            let flag = addPageLinks(tagLinks, i);
            if (!flag) {
                break;
            }
        }

        for (let i = pageNumber + 1; i < PDFViewerApplication.pagesCount; i++) {
            let flag = addPageLinks(tagLinks, i);
            if (!flag) {
                break;
            }
        }

        this.link_layer = {};
        if (tagLinks.length == 0) {
            this.clear();
            // this.turnOff();
            return;
        }
        tagLinks.sort(function(a, b) {
            return a.pos - b.pos;
        });

        var char_num = Array(Math.ceil(
            Math.max(1,
                Math.log(tagLinks.length) / Math.log(char_list.length)
            )
        )).fill(0);
        for (let tagLink of tagLinks) {
            let iDiv = document.createElement('div');
            iDiv.style.left = tagLink.link.style.left;
            iDiv.style.top = tagLink.link.style.top;
            iDiv.classList.add("link_tag");
            let tag = char_num.map(x => char_list[x]).join('');
            iDiv.innerHTML = `<span class="clicked" id="clicked"></span> ${tag}`;
            tagLink.annotationLayer.prepend(iDiv);
            this.link_layer[tag] = [iDiv, tagLink.link.children[0]];
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

    empty() {
        return Object.keys(this.link_layer).length === 0;
    }

    clear() {
        for (var key in this.link_layer) {
            this.link_layer[key][0].remove();
        }
        this.link_layer = {};
    }

    turnOff() {
        new QWebChannel(qt.webChannelTransport,
            function(channel) {
                channel.objects.link_shortcut.reset();
            }
        );
    }

    click(key) {
        if (key in this.link_layer) {
            this.link_layer[key][1].click();
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

function gotoPosition(pageNumber, x, y, flip, ys, flag) {
    // flag: 1 - x only; 2 - y only; 3 - x and y
    let vp = PDFViewerApplication.pdfViewer.getPageView(pageNumber - 1).viewport;
    let pos = vp.convertToViewportPoint(x, y)
    if ((flag & 1) == 1) {
        PDFViewerApplication.pdfViewer.container.scrollLeft = vp.width + pos[0];
    }
    if ((flag & 2) == 2) {
        PDFViewerApplication.page = pageNumber;
        if (flip) {
            pos[1] = vp.height - pos[1];
        }
        PDFViewerApplication.pdfViewer.container.scrollTop += pos[1] + ys;
    }
}

window.removeEventListener("keydown", window.eventListenerList.keydown[1].listener)

var _viewerContainerTop = '0px';

function toggleToolbar() {
    tc = document.getElementsByClassName('toolbar')[0];
    if (tc.style.display == 'none') {
        tc.style.display = '';
    } else {
        tc.style.display = 'none';
    }
    let t = PDFViewerApplication.pdfViewer.container.style.top;
    PDFViewerApplication.pdfViewer.container.style.top = _viewerContainerTop;
    PDFViewerApplication.pdfSidebar.sidebarContainer.style.top = _viewerContainerTop
    _viewerContainerTop = t;
}

function toggleMarks() {
    var iDiv = document.createElement('div');
    iDiv.innerText = 'fwe';
    iDiv.style.left = "50%";
    iDiv.style.top = "50%";
    // iDiv.style.position="absolute";
    iDiv.style["z-index"] = "200";
    PDFViewerApplication.pdfViewer.container.prepend(iDiv);
}


class Marks {
    constructor() {
        var iDiv = document.createElement('list');
        iDiv.classList.add("mark_list");
        this.dashboard = iDiv;
        PDFViewerApplication.pdfViewer.container.parentElement.prepend(iDiv);
        this.positions = [null, null, null, null, null];
    }
    toggle() {
        if (this.dashboard.style.display == 'none') {
            this.dashboard.style.display = '';
        } else {
            this.dashboard.style.display = 'none';
        }
    }
    goto(mi) {
        let location = this.positions[mi];
        if (location == null) {
            return;
        }
        this.positions[0] = PDFViewerApplication.pdfViewer._location;
        gotoPosition(location.pageNumber, location.left, location.top, false, 0, 3)
        this.updateDashboard();
    }
    mark(mi) {
        this.positions[mi] = PDFViewerApplication.pdfViewer._location;
        this.updateDashboard();
    }
    updateDashboard() {
        let s = '';
        this.positions.forEach(
            function(l, i) {
                if (l == null) {
                    return;
                }
                if (i == 0) {
                    s += `<li>&nbsp;:${l.pageNumber}</li>`;
                } else {
                    s += `<li>${i}:${l.pageNumber}</li>`;
                }
            }
        )
        this.dashboard.innerHTML = s;
    }
}

marks = new Marks();

class PageShortcut {
    check(cmd) {
        return (["n", "p", "0", "gg", "$", "G", "/"].includes(cmd));
    }
    execute(cmd) {
        switch (cmd) {
            case "0":
            case "gg":
                PDFViewerApplication.page = 1;
                break;
            case "$":
            case "G":
                PDFViewerApplication.page = PDFViewerApplication.pagesCount;
                break;
            case "n":
                PDFViewerApplication.page = Math.min(PDFViewerApplication.page + 1, PDFViewerApplication.pagesCount);
                break;
            case "p":
                PDFViewerApplication.page = Math.max(PDFViewerApplication.page - 1, 0);
                break;
            case "/":
                if (!PDFViewerApplication.supportsIntegratedFind) {
                  PDFViewerApplication.findBar.open();
                  handled = true;
                }

                break;
        }
    }
}

class MarksShortcut {
    check(cmd) {
        return [" ", "1", "2", "3", "4", "m ", "m1", "m2", "m3", "m4"].includes(cmd);
    }

    execute(cmd) {
        if ([" ", "1", "2", "3", "4"].includes(cmd)) {
            if (cmd == " ") {
                cmd = "0";
            }
            marks.goto(parseInt(cmd));
        } else {
            if (cmd == "m ") {
                cmd = "m0";
            }
            marks.mark(parseInt(cmd.slice(1)));
        }
    }
}

class ScrollShortcut {
    constructor(scrollSpeeds) {
        this._scrollSpeeds = [...scrollSpeeds];
        this._lastScroll = 0;
    }

    getScrollSpeed() {
        let new_scroll = performance.now();
        let dt = (new_scroll - this._last_scroll) / 1000;
        this._last_scroll = new_scroll
        var v;
        for (v of this._scrollSpeeds) {
            if (dt > v[0]) {
                return v[1]
            }
        }
        return v[1]
    }

    check(cmd) {
        return ["h", "j", "k", "l"].includes(cmd);
    }
    execute(cmd) {
        let v = this.getScrollSpeed()
        switch (cmd) {
            case "j":
                PDFViewerApplication.pdfViewer.container.scrollTop += v;
                break
            case "k":
                PDFViewerApplication.pdfViewer.container.scrollTop -= v;
                break;
            case "h":
                PDFViewerApplication.pdfViewer.container.scrollLeft -= v;
                break;
            case "l":
                PDFViewerApplication.pdfViewer.container.scrollLeft += v;
                break;
        }
    }
}

class ZoomShortcut {
    check(cmd) {
        return ["-", "=", "+"].includes(cmd);
    }

    execute(cmd) {
        switch (cmd) {
            case "-":
                PDFViewerApplication.zoomOut();
                break;
            case "=":
            case "+":
                PDFViewerApplication.zoomIn();
                break;
        }
    }
}


class ControlShortcut {
    check(cmd) {
        return ["S", "T", "t", "M"].includes(cmd);
    }

    execute(cmd) {
        switch (cmd) {
            case "S":
                PDFViewerApplication.pdfSidebar.toggle();
                break;
            case "t":
                if (document.getElementsByClassName('toolbar')[0].style.display == 'none') {
                    toggleToolbar();
                }
                PDFViewerApplication.appConfig.toolbar.pageNumber.select();
                break;
            case "T":
                toggleToolbar();
                break
            case "M":
                marks.toggle();
        }
    }
}

class LinkShortcut {
    constructor(charList) {
        this.charList = Array.from(charList);
        this._linkLayer = null;
        this.on = false;
        this._cmd = [];
    }

    check(cmd) {
        return cmd == "f";
    }

    execute(cmd) {
        this._linkLayer = new LinkLayer(this.charList);
        this.on = !this._linkLayer.empty();
    }


    keypress(cmd) {
        if (this._linkLayer.click(cmd.join(''))) {
            this.on = false;
            this._linkLayer.clear();
            return [];
        }
        return cmd;
    }

    exit() {
        if (this.on) {
            this._linkLayer.clear();
            this.on = false;
        }
    }
}

class Shortcuts {
    constructor() {
        this.link = new LinkShortcut(config["link_char_list"]),
            this._list = [
                new ScrollShortcut(config["scroll_speeds"]),
                new PageShortcut(),
                new ZoomShortcut(),
                new MarksShortcut(),
                new ControlShortcut(),
            ];
        this._list.push(this.link);
        this.cmd = [];
    }

    keypress(e) {
        this.cmd.push(e.key);
        if (this.link.on) {
            this.cmd = this.link.keypress(this.cmd);
        } else {
            let cmd = this.cmd.join('');
            let executed = false;
            for (let sc of this._list) {
                if (sc.check(cmd)) {
                    sc.execute(cmd);
                    executed = true;
                    break;
                }
            }
            if (executed) {
                this.cmd = [];
            }
        }
        return this.cmd;
    }

    exit() {
        for (let sc of this._list) {
            if ("exit" in sc) {
                sc.exit();
            }
        }
        this.cmd = [];

        if (PDFViewerApplication.secondaryToolbar.isOpen) {
          PDFViewerApplication.secondaryToolbar.close();
          handled = true;
        }

        if (!PDFViewerApplication.supportsIntegratedFind && PDFViewerApplication.findBar.opened) {
          PDFViewerApplication.findBar.close();
          handled = true;
        }
        PDFViewerApplication.pdfViewer.focus();
    }
}

const sc = new Shortcuts();

function shortcuts(e) {
    if (e.target.id != "viewerContainer") {
        return;
    }
    e.preventDefault();
    sc.keypress(e);
}

window.addEventListener('keypress', shortcuts);

document.onkeydown = function(evt) {
    evt = evt || window.event;
    var isEscape = false;
    if ("key" in evt) {
        isEscape = (evt.key === "Escape" || evt.key === "Esc");
    } else {
        isEscape = (evt.keyCode === 27);
    }
    if (isEscape) {
        sc.exit();
    }
};

var styleSheet = document.createElement("style");
styleSheet.innerText = config.css;
document.head.appendChild(styleSheet);

if (config._inverseSearch == true) {
    PDFViewerApplication.pdfViewer.viewer.addEventListener('click', inverseSearchClick);
}
