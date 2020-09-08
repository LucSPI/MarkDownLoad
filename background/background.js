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
  title: "{title}",
  includeTemplate: false,
  saveAs: false
}

// add notification listener for foreground page messages
browser.runtime.onMessage.addListener(notify);
// create context menus
createMenus();

// function to convert the article content to markdown using Turndown
function turndown(content, options) {
  var turndownService = new TurndownService(options);
  var markdown = options.frontmatter + turndownService.turndown(content)
    + options.backmatter;
  return markdown;
}

// function to replace placeholder strings with article info
function textReplace(string, article) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      const s = article[key] || '';
      string = string.split('{' + key + '}').join(s);
    }
  }

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

// function to get the options from storage and substitute default options if it fails
async function getOptions() {
  let options = defaultOptions;
  try {
    options = await browser.storage.sync.get(defaultOptions);
  } catch (err) {
    console.error(err);
  }
  return options;
}

// function to convert an article info object into markdown
async function convertArticleToMarkdown(article) {
  const options = await getOptions();

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  return turndown(article.content, options);
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
async function downloadMarkdown(markdown, title) {
  // create the object url with markdown data as a blob
  const url = URL.createObjectURL(new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  }));

  try {
    // get the options (for save as)
    const options = await getOptions();
    // start the download
    const id = await browser.downloads.download({
      url: url,
      filename: generateValidFileName(title) + ".md",
      saveAs: options.saveAs
    });
    // add a listener for the download completion
    browser.downloads.onChanged.addListener((delta) => {
      if (delta.state && delta.state.current == "complete") {
        //release the url for the blob
        if (delta.id === id) {
          window.URL.revokeObjectURL(url);
        }
      }
    });
  }
  catch (err) {
    console.error("Download failed" + err);
  }
}

//function that handles messages from the injected script into the site
async function notify(message) {
  // message for initial clipping of the dom
  if (message.type == "clip") {
    // get the article info from the passed in dom
    const article = await getArticleFromDom(message.dom);

    // if selection info was passed in (and we're to clip the selection)
    // replace the article content
    if (message.selection && message.clipSelection) {
      article.content = message.selection;
    }

    // convert the article to markdown
    const markdown = await convertArticleToMarkdown(article);
    // format the title
    article.title = await formatTitle(article);
    // display the data in the popup
    await browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article });
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title);
  }
}

// create the context menus
async function createMenus() {
  const options = await getOptions();

  browser.contextMenus.removeAll();

  // download actions
  browser.contextMenus.create({
    id: "download-markdown-selection",
    title: "Download Selection As Markdown",
    contexts: ["selection"]
  }, () => {});
  browser.contextMenus.create({
    id: "download-markdown-all",
    title: "Download All As Markdown",
    contexts: ["all"]
  }, () => {});

  browser.contextMenus.create({
    id: "separator-1",
    type: "separator",
    contexts: ["all"]
  }, () => {});

  // copy to clipboard actions
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
  }, () => { });
  
  browser.contextMenus.create({
    id: "separator-2",
    type: "separator",
    contexts: ["all"]
  }, () => { });
  
  // options
  browser.contextMenus.create({
    id: "toggle-includeTemplate",
    type: "checkbox",
    title: "Include templates in Copy",
    contexts: ["all"],
    checked: options.includeTemplate
  }, () => { });
}

// click handler for the context menus
browser.contextMenus.onClicked.addListener(function (info, tab) {
  // one of the copy to clipboard commands
  if (info.menuItemId.startsWith("copy-markdown")) {
    copyMarkdownFromContext(info, tab);
  }
  // one of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    downloadMarkdownFromContext(info, tab);
  }
  // a settings toggle command
  else if (info.menuItemId.startsWith("toggle-")) {
    toggleSetting(info.menuItemId.split('-')[1]);
  }
});

// this function toggles the specified option
async function toggleSetting(setting, options = null) {
  // if there's no options object passed in, we need to go get one
  if (options == null) {
      // get the options from storage and toggle the setting
      await toggleSetting(setting, await getOptions());
  }
  else {
    // toggle the option and save back to storage
    options[setting] = !options[setting];
    await browser.storage.sync.set(options);
  }
}

// this function ensures the content script is loaded (and loads it if it isn't)
async function ensureScripts(tabId) {
  const results = await browser.tabs.executeScript(tabId, { code: "typeof getSelectionAndDom === 'function';" })
  // The content script's last expression will be true if the function
  // has been defined. If this is not the case, then we need to run
  // pageScraper.js to define function getSelectionAndDom.
  if (!results || results[0] !== true) {
    await browser.tabs.executeScript(tabId, {file: "/contentScript/contentScript.js"});
  }
}

// get Readability article info from the dom passed in
async function getArticleFromDom(domString) {
  // parse the dom
  const parser = new DOMParser();
  const dom = parser.parseFromString(domString, "text/html");
  if (dom.documentElement.nodeName == "parsererror") {
    console.error("error while parsing");
  }

  // simplify the dom into an article
  const article = new Readability(dom).parse();
  // get the base uri from the dom and attach it as important article info
  article.baseURI = dom.baseURI;

  // return the article
  return article;
}

// get Readability article info from the content of the tab id passed in
// `selection` is a bool indicating whether we should just get the selected text
async function getArticleFromContent(tabId, selection = false) {
  // run the content script function to get the details
  const results = await browser.tabs.executeScript(tabId, { code: "getSelectionAndDom()" });

  // make sure we actually got a valid result
  if (results && results[0] && results[0].dom) {
    const article = await getArticleFromDom(results[0].dom, selection);

    // if we're to grab the selection, and we've selected something,
    // replace the article content with the selection
    if (selection && results[0].selection) {
      article.content = results[0].selection;
    }

    //return the article
    return article;
  }
  else return null;
}

// function to apply the title template
async function formatTitle(article) {
  try {
    const options = await getOptions();
    return textReplace(options.title, article);
  }
  catch (err) {
    return textReplace(defaultOptions.title, article);
  }
}

// function to download markdown, triggered by context menu
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
  const title = await formatTitle(article);
  const markdown = await convertArticleToMarkdown(article);
  await downloadMarkdown(markdown, title); 

}

// function to copy markdown to the clipboard, triggered by context menu
async function copyMarkdownFromContext(info, tab) {
  try{
    await ensureScripts(tab.id);
    if (info.menuItemId == "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const markdown = turndown(`<a href="${info.linkUrl}">${info.linkText}</a>`, options);
      await browser.tabs.executeScript(tab.id, {code: `copyToClipboard(${JSON.stringify(markdown)})`});
    }
    else if (info.menuItemId == "copy-markdown-image") {
      await browser.tabs.executeScript(tab.id, {code: `copyToClipboard("![](${info.srcUrl})")`});
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      const markdown = await convertArticleToMarkdown(article);
      await browser.tabs.executeScript(tab.id, {code: `copyToClipboard(${JSON.stringify(markdown)})`});
    }
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy text: " + error);
  };
}