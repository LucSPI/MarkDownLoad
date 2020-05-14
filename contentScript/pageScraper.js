function notifyExtension() {
    //var serializer = new XMLSerializer();
    //var content = serializer.serializeToString(document);
    var content = document.documentElement.outerHTML;
    browser.runtime.sendMessage({ type: "clip", dom: content, url:window.location.href});
}
notifyExtension();