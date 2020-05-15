function notifyExtension() {
    // if the document doesn't have a "base" element make one
    // this allows the DOM parser in future steps to fix relative uris
    let baseEl = document.createElement('base');
    
    // check for a existing base elements
    let baseEls = document.head.getElementsByTagName('base');
    if (baseEls.length > 0) { baseEl = baseEls[0]; }
    // if we don't find one, append this new one.
    else { document.head.append(baseEl); }
    
    // if the base element doesn't have a href, use the current location
    if (!baseEl.getAttribute('href')) {
        baseEl.setAttribute('href', window.location.href);
    }

    // get the content of the page as a string
    var content = document.documentElement.outerHTML;
    
    // send a message that the content should be clipped
    browser.runtime.sendMessage({ type: "clip", dom: content});
}
notifyExtension();