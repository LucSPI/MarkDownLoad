function notifyExtension() {
    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris
    if (document.head.getElementsByTagName('base').length == 0) {
        let baseEl = document.createElement('base');
        // use the current uri
        baseEl.setAttribute('href', window.location.href);
        document.head.append(baseEl);
    }

    // get the content of the page as a string
    var content = document.documentElement.outerHTML;
    
    // send a message that the content should be clipped
    browser.runtime.sendMessage({ type: "clip", dom: content});
}
notifyExtension();