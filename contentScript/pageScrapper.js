function notifyExtension() {
    //var serializer = new XMLSerializer();
    //var content = serializer.serializeToString(document);
    var content = document.documentElement.outerHTML;
    if (chrome) {
      chrome.runtime.sendMessage({type: "clip", "dom": content});
    }else {
      browser.runtime.sendMessage({ type: "clip", "dom": content});
    }
  }
  notifyExtension();