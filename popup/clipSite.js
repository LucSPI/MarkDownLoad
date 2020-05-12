if (chrome) {
    chrome.tabs.query({currentWindow: true, active: true}, function(tabs) {
        var id = tabs[0].id;
        var url = tabs[0].url;
          chrome.tabs.executeScript(id, {
              file: "/contentScript/pageScrapper.js"
          }, function() {
              console.log("Successfully injected");
          });
        
    });
} else {
    browser.tabs.query({currentWindow: true, active: true})
    .then((tabs) => {
      var id = tabs[0].id;
      var url = tabs[0].url;
        browser.tabs.executeScript(id, {
            file: "/contentScript/pageScrapper.js"
        }).then( () => {
            console.log("Successfully injected");
        }).catch( (error) => {
            console.error(error);
        });
      });
}

if (chrome) {
    chrome.runtime.onMessage.addListener(notify);
} else {
    browser.runtime.onMessage.addListener(notify);
}

function download(e) {
    e.preventDefault();
    var message = {
        type: "download",
        markdown: document.getElementById("md").value,
        title: document.getElementById("md").title
    };
    if (chrome) {
        chrome.runtime.sendMessage(message);
    } else {
        browser.runtime.sendMessage(message);
    }
}

//function that handles messages from the injected script into the site
function notify(message) {
    if (message.type == "display.md") {
        document.getElementById("md").value = message.markdown;
        document.getElementById("md").title = message.article.title;
        document.getElementById("download").addEventListener("click", download);
        document.getElementById("container").style.display = 'block';
        document.getElementById("spinner").style.display = 'none';
    }
}

