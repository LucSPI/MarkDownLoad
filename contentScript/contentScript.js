function notifyExtension() {
    // send a message that the content should be clipped
    browser.runtime.sendMessage({ type: "clip", dom: content});
}

function getHTMLOfDocument() {
    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris
    let baseEl = document.createElement('base');

    // check for a existing base elements
    let baseEls = document.head.getElementsByTagName('base');
    if (baseEls.length > 0) {
        baseEl = baseEls[0];
    }
    // if we don't find one, append this new one.
    else {
        document.head.append(baseEl);
    }

    // if the base element doesn't have a href, use the current location
    if (!baseEl.getAttribute('href')) {
        baseEl.setAttribute('href', window.location.href);
    }

    // get the content of the page as a string
    return document.documentElement.outerHTML;
}

// code taken from here: https://stackoverflow.com/a/5084044/304786
function getHTMLOfSelection() {
    var range;
    if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        return range.htmlText;
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            var clonedSelection = range.cloneContents();
            var div = document.createElement('div');
            div.appendChild(clonedSelection);
            return div.innerHTML;
        } else {
            return '';
        }
    } else {
        return '';
    }
}

function getSelectionAndDom() {
    return {
        selection: getHTMLOfSelection(),
        dom: getHTMLOfDocument()
    }
}

// This function must be called in a visible page, such as a browserAction popup
// or a content script. Calling it in a background page has no effect!
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}

function downloadMarkdown(filename, text) {
    console.log("downloadMarkdown", filename, text);
    let datauri = `data:text/markdown;base64,${text}`;
    var link = document.createElement('a');
    link.download = filename;
    link.href = datauri;
    link.click();
}