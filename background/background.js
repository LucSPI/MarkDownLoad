browser.runtime.onMessage.addListener(notify);

function createReadableVersion(dom) {
  var reader = new Readability(dom);
  var article = reader.parse();
  return article;
}

function convertArticleToMarkdown(article) {
  var turndownService = new TurndownService()
  var markdown = turndownService.turndown(article.content);
  
  //add article title as header
  markdown = "# " + article.title + "\n" + markdown;

  //add summary if exist
  if (article.excerpt != null) {
    markdown = "> " + article.excerpt + "\n\n" + markdown;
  }
  return markdown;
}

function generateValidFileName(title) {
  //remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name =  title.replace(illegalRe, "");
  return name;
}

function downloadMarkdown(markdown, title) {
  var blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);

  browser.downloads.download({
    url: url,
    filename: generateValidFileName(title) + ".md",
    saveAs: true
  }).then((id) => {
    browser.downloads.onChanged.addListener((delta ) => {
      //release the url for the blob
      if (delta.state && delta.state.current == "complete") {
        if (delta.id === id) {
          window.URL.revokeObjectURL(url);
        }
      }
    });
  }).catch((err) => {
    console.error("Download failed" + err)
  });
}


//function that handles messages from the injected script into the site
function notify(message) {
  if (message.type == "clip") {
    var parser = new DOMParser();
    var dom = parser.parseFromString(message.dom, "text/html");
    if (dom.documentElement.nodeName == "parsererror") {
      console.error("error while parsing");
    }

    var article = createReadableVersion(dom);
    var markdown = convertArticleToMarkdown(article);
    browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article });
  }
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title);
  }
}