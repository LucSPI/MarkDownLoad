// add notification listener for foreground page messages
browser.runtime.onMessage.addListener(notify);

// these are the default options
const defaultOptions = {
  headingStyle: "setext",
  hr: "***",
  bulletListMarker: "*",
  codeBlockStyle: "indented",
  fence: "```",
  emDelimiter: "_",
  strongDelimiter: "**",
  linkStyle: "inlined",
  linkReferenceStyle: "full",
  frontmatter: "{baseURI}\n\n> {excerpt}\n\n# {title}",
  backmatter: "",
  includeTemplate: false
}

// convert the article content to markdown using Turndown
function convertArticleToMarkdownForReal(content, options) {
  var turndownService = new TurndownService(options);
  var markdown = options.frontmatter + turndownService.turndown(content)
    + options.backmatter;
  return markdown;
}

function textReplace(string, article, dom) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      const s = article[key] || '';
      string = string.split('{' + key + '}').join(s);
    }
  }

  string = string.replace("{baseURI}", dom.baseURI);

  // replace date formats
  const now = new Date();
  const dateRegex = /{date:(.+?)}/g
  const matches = string.match(dateRegex);
  if (matches && matches.forEach) {
    matches.forEach(match => {
      const format = match.substring(6, match.length - 1);
      const dateString = moment(now).format(format);
      string = string.replace(match, dateString);
    });
  }

  return string;
}

function convertArticleToMarkdown(article, dom) {

  const optionsLoaded = options => {
    let testOptions = {
      ...options,
      frontmatter: !options.includeTemplate ? '' : (textReplace(options.frontmatter, article, dom) + '\n'),
      backmatter: !options.includeTemplate ? '' : ('\n' + textReplace(options.backmatter, article, dom)),
    }
    return convertArticleToMarkdownForReal(article.content, testOptions);
  }

  const onError = error => {
    console.error(error);
    return convertArticleToMarkdownForReal(article.content, {
      ...defaultOptions,
      frontmatter: !defaultOptions.includeTemplate ? '' : (textReplace(defaultOptions.frontmatter, article, dom) + '\n'),
      backmatter: !defaultOptions.includeTemplate ? '' : ('\n' + textReplace(defaultOptions.backmatter, article, dom)),
    });
  }

  return browser.storage.sync.get(defaultOptions).then(optionsLoaded, onError);
}

// function to turn the title into a valid file name
function generateValidFileName(title) {
  // remove < > : " / \ | ? * 
  // and non-breaking spaces (thanks @Licat)
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name = title.replace(illegalRe, "").replace('\u00A0', ' ');
  return name;
}

// function to actually download the markdown file
function downloadMarkdown(markdown, title) {
  var blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);

  browser.downloads.download({
    url: url,
    filename: generateValidFileName(title) + ".md"
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
  // message for initial clipping of the dom
  if (message.type == "clip") {

    // parse the dom
    var parser = new DOMParser();
    var dom = parser.parseFromString(message.dom, "text/html");
    if (dom.documentElement.nodeName == "parsererror") {
      console.error("error while parsing");
    }

    // make markdown document from the dom
    var article = new Readability(dom).parse();

    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }

    convertArticleToMarkdown(article, dom).then(markdown => 
      // send a message to display the markdown
      browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article })
    );
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title);
  }
}

browser.storage.sync.get(defaultOptions)
  .then(options => createMenus(options))
  .catch(error => {
    console.error(error);
    createMenus(defaultOptions);
  });

function createMenus(options) {
  browser.contextMenus.removeAll();
  browser.contextMenus.create({
    id: "copy-markdown-selection",
    title: "Copy Selection As Markdown",
    contexts: ["selection"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-markdown-link",
    title: "Copy Link As Markdown",
    contexts: ["link"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-markdown-image",
    title: "Copy Image As Markdown",
    contexts: ["image"]
  }, () => {});
  browser.contextMenus.create({
    id: "copy-markdown-all",
    title: "Copy All As Markdown",
    contexts: ["all"]
  }, () => {});
  browser.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: ["all"]
  }, () => {});
  browser.contextMenus.create({
    id: "toggle-includeTemplate",
    type: "checkbox",
    title: "Include templates in Copy",
    contexts: ["all"],
    checked: options.includeTemplate
  }, () => { });
}




browser.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId.startsWith("copy-markdown")) {
    copyMarkdown(info, tab);
  }
  else if (info.menuItemId.startsWith("toggle-")) {
    toggleSetting(info.menuItemId.split('-')[1]);
  }
});

function toggleSetting(setting, options = null) {
  if (options == null) {
    browser.storage.sync.get(defaultOptions)
      .then(options => toggleSetting(setting, options))
      .catch(error => {
        console.error(error);
        toggleSetting(setting, defaultOptions);
      });
  }
  else {
    options[setting] = !options[setting];
    browser.storage.sync.set(options);
  }
}

function copyMarkdown(info, tab) {

  browser.tabs.executeScript(tab.id, {
    code: "typeof getHTMLOfSelection === 'function';",
  }).then((results) => {
    // The content script's last expression will be true if the function
    // has been defined. If this is not the case, then we need to run
    // pageScraper.js to define function getHTMLOfSelection.
    if (!results || results[0] !== true) {
      return browser.tabs.executeScript(tab.id, {
        file: "/contentScript/contentScript.js",
      });
    }
  }).then(() => {
    if (info.menuItemId == "copy-markdown-link") {
      return browser.storage.sync.get({
        linkStyle: defaultOptions.linkStyle
      }).then(options => {
        var turndownService = new TurndownService(options);
        var markdown = turndownService.turndown(`<a href="${info.linkUrl}">${info.linkText}</a>`)
        browser.tabs.executeScript(tab.id, {
          code: `copyToClipboard(${JSON.stringify(markdown)})`,
        });
      });
    } else if (info.menuItemId == "copy-markdown-image") {
      return browser.tabs.executeScript(tab.id, {
        code: `copyToClipboard("![](${info.srcUrl})")`,
      });
    } else {

      return browser.tabs.executeScript(tab.id, {
        code: "getSelectionAndDom()",
      }).then((results) => {
        if (results && results[0] && results[0].dom) {
          // parse the dom
          var parser = new DOMParser();
          var dom = parser.parseFromString(results[0].dom, "text/html");
          if (dom.documentElement.nodeName == "parsererror") {
            console.error("error while parsing");
          }

          // make markdown document from the dom
          var article = new Readability(dom).parse();
          if (info.menuItemId == "copy-markdown-selection" && results[0].selection) {
            article.content = results[0].selection;
          }
          return convertArticleToMarkdown(article, dom);
        }
      }).then(markdown => {
        return browser.tabs.executeScript(tab.id, {
          code: `copyToClipboard(${JSON.stringify(markdown)})`,
        });
      });
    }
  }).catch((error) => {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy text: " + error);
  });
}