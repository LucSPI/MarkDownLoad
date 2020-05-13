
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
        title: document.getElementById("md").title
    };

    browser.runtime.sendMessage(message);
}

//function that handles messages from the injected script into the site
function notify(message) {
    if (message.type == "display.md") {
        document.getElementById("md").value = message.markdown;
        document.getElementById("md").title = message.article.title;
        document.getElementById("download").addEventListener("click", download);
        document.getElementById("container").style.display = 'flex';
        document.getElementById("spinner").style.display = 'none';
    }
}

