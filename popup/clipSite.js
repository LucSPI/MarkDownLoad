
// default variables
var selectedText = null;

// set up event handlers
document.getElementById("md").addEventListener("select", select);
document.getElementById("md").addEventListener("change", select);
document.getElementById("md").addEventListener("blur", select);
document.getElementById("md").addEventListener("mouseup", select);
document.getElementById("md").addEventListener("keyup", select);
document.getElementById("md").addEventListener("click", select);
document.getElementById("download").addEventListener("click", download);
document.getElementById("downloadSelection").addEventListener("click", downloadSelection);

// inject the necessary scripts
browser.tabs.query({ currentWindow: true, active: true })
.then((tabs) => {
    var id = tabs[0].id;
    var url = tabs[0].url;
    browser.tabs.executeScript(id, {
        file: "/browser-polyfill.min.js"
    }).then(() => {
        return browser.tabs.executeScript(id, {
            file: "/contentScript/pageScraper.js"
        });
    }).then( () => {
        console.log("Successfully injected");
    }).catch( (error) => {
        console.error(error);
    });
});

// listen for notifications from the background page
browser.runtime.onMessage.addListener(notify);

//function to send the download message to the background page
function sendDownloadMessage(text) {
    if (text != null) {

        var message = {
            type: "download",
            markdown: text,
            title: document.getElementById("title").value
        };

        browser.runtime.sendMessage(message);
    }
}

// event handler for download button
function download(e) {
    e.preventDefault();
    sendDownloadMessage(document.getElementById("md").value);
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
        
        // show the hidden elements
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
    }
}

