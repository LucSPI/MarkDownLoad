
browser.tabs.query({currentWindow: true, active: true})
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


browser.runtime.onMessage.addListener(notify);

function download(e) {
    e.preventDefault();
    var message = {
        type: "download",
        markdown: document.getElementById("md").value,
        title: document.getElementById("title").value
    };

    browser.runtime.sendMessage(message);
}

//function that handles messages from the injected script into the site
function notify(message) {
    if (message.type == "display.md") {
        document.getElementById("md").value = message.markdown;
        document.getElementById("title").value = message.article.title;
        document.getElementById("md").addEventListener("select", select);
        document.getElementById("md").addEventListener("change", select);
        document.getElementById("md").addEventListener("blur", select);
        document.getElementById("md").addEventListener("mouseup", select);
        document.getElementById("md").addEventListener("keyup", select);
        document.getElementById("md").addEventListener("click", select);
        document.getElementById("download").addEventListener("click", download);
        document.getElementById("downloadSelection").addEventListener("click", downloadSelection);
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
    }
}

function select (event) {
    var start = event.currentTarget.selectionStart;
    var finish = event.currentTarget.selectionEnd;
    var a = document.getElementById("downloadSelection");

    if (start != finish) {
        a.style.display = "block";
    }
    else {
        a.style.display = "none";
    }
}

function downloadSelection(e) {
    e.preventDefault();
    var md = document.getElementById("md");
    var start = md.selectionStart;
    var finish = md.selectionEnd;
    var selection = md.value.substring(start, finish);
    
    var message = {
        type: "download",
        markdown: selection,
        title: md.title
    };

    browser.runtime.sendMessage(message);
}
