
// default variables
var selectedText = null;
var imageList = null;

// set up event handlers
document.getElementById("md").addEventListener("select", select);
document.getElementById("md").addEventListener("change", select);
document.getElementById("md").addEventListener("blur", select);
document.getElementById("md").addEventListener("mouseup", select);
document.getElementById("md").addEventListener("keyup", select);
document.getElementById("md").addEventListener("click", select);
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

const defaultOptions = {
    includeTemplate: false,
    clipSelection: true
}

const checkInitialSettings = options => {
    if (options.includeTemplate)
        document.querySelector("#includeTemplate > i").classList.add("checked");

    if (options.clipSelection)
        document.querySelector("#selected > i").classList.add("checked");
    else
        document.querySelector("#document > i").classList.add("checked");
}

const toggleClipSelection = options => {
    options.clipSelection = !options.clipSelection;
    document.querySelector("#selected > i").classList.toggle("checked");
    document.querySelector("#document > i").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => clipSite()).catch((error) => {
        console.error(error);
    });
}

const toggleIncludeTemplate = options => {
    options.includeTemplate = !options.includeTemplate;
    document.querySelector("#includeTemplate > i").classList.toggle("checked");
    browser.storage.sync.set(options).then(() => {
        browser.contextMenus.update("toggle-includeTemplate", {
            checked: options.includeTemplate
        });
        try {
            browser.contextMenus.update("tabtoggle-includeTemplate", {
                checked: options.includeTemplate
            });
        } catch { }
        return clipSite()
    }).catch((error) => {
        console.error(error);
    });
}

const showOrHideClipOption = selection => {
    if (selection) {
        document.getElementById("clipOption").style.display = "flex";
    }
    else {
        document.getElementById("clipOption").style.display = "none";
    }
}

const clipSite = id => {
    return browser.tabs.executeScript(id, { code: "getSelectionAndDom()" })
        .then((result) => {
            if (result && result[0]) {
                showOrHideClipOption(result[0].selection);
                let message = {
                    type: "clip",
                    dom: result[0].dom,
                    selection: result[0].selection
                }
                return browser.storage.sync.get(defaultOptions).then(options => {
                    browser.runtime.sendMessage({
                        ...message,
                        ...options
                    });
                }).catch(err => {
                    console.error(err);
                    browser.runtime.sendMessage({
                        ...message,
                        ...defaultOptions
                    });
                });
            }
        });
}

// inject the necessary scripts
browser.storage.sync.get(defaultOptions).then(options => {
    checkInitialSettings(options);
    
    document.getElementById("selected").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("document").addEventListener("click", (e) => {
        e.preventDefault();
        toggleClipSelection(options);
    });
    document.getElementById("includeTemplate").addEventListener("click", (e) => {
        e.preventDefault();
        toggleIncludeTemplate(options);
    });
    
    return browser.tabs.query({
        currentWindow: true,
        active: true
    });
}).then((tabs) => {
    var id = tabs[0].id;
    var url = tabs[0].url;
    browser.tabs.executeScript(id, {
        file: "/browser-polyfill.min.js"
    })
    .then(() => {
        return browser.tabs.executeScript(id, {
            file: "/contentScript/contentScript.js"
        });
    }).then( () => {
        console.log("Successfully injected");
        return clipSite(id);
    }).catch( (error) => {
        console.error(error);
    });
});

// listen for notifications from the background page
browser.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        browser.tabs.query({
            currentWindow: true,
            active: true
        }).then(tabs => {
            var message = {
                type: "download",
                markdown: text,
                title: document.getElementById("title").value,
                tab: tabs[0],
                imageList: imageList
            };
    
            browser.runtime.sendMessage(message);
        });
    }
}

// event handler for download button
function download(e) {
    e.preventDefault();
    sendDownloadMessage(document.getElementById("md").value);
    window.close();
}

// event handler for download selected button
function downloadSelection(e) {
    e.preventDefault();
    if (selectedText != null) {
        sendDownloadMessage(selectedText);
    }
}

// event handler for selecting (or deselecting) text
function select(event) {
    var start = event.currentTarget.selectionStart;
    var finish = event.currentTarget.selectionEnd;

    var a = document.getElementById("downloadSelection");

    if (start != finish) {
        selectedText = event.currentTarget.value.substring(start, finish);
        a.style.display = "block";
    }
    else {
        selectedText = null;
        a.style.display = "none";
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    // message for displaying markdown
    if (message.type == "display.md") {

        // set the values from the message
        document.getElementById("md").value = message.markdown;
        document.getElementById("title").value = message.article.title;
        imageList = message.imageList;
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
         // focus the download button
        document.getElementById("download").focus();
    }
}

