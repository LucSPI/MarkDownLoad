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
  saveAs: false,
  downloadImages: false,
  imagePrefix: '{title}/',
  disallowedChars: '[]#^'
}

// add notification listener for foreground page messages
browser.runtime.onMessage.addListener(notify);
// create context menus
createMenus();

// function to convert the article content to markdown using Turndown
function turndown(content, options) {
  var turndownService = new TurndownService(options);

  turndownService.keep(['iframe']);

  let imageList = {};
  if (options.downloadImages) {
    turndownService.addRule('images', {
      filter: function (node, tdopts) {
        if (node.nodeName == 'IMG' && node.getAttribute('src')) {
          const src = node.getAttribute('src');
          const imageFilename = getImageFilename(src, options);
          imageList[src] = imageFilename;
          node.setAttribute('src', imageFilename.split('/').map(s=>encodeURI(s)).join('/'));
        }
        return false;
      }
    });
  }

  let markdown = options.frontmatter + turndownService.turndown(content)
      + options.backmatter;
  return { markdown: markdown, imageList: imageList };
}

function getImageFilename(src, options) {
  const slashPos = src.lastIndexOf('/');
  const queryPos = src.indexOf('?');
  const filename = src.substring(slashPos+1, queryPos > 0 ? queryPos : src.length);
  return (options.imagePrefix || '') + filename;
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
      string = string.replaceAll(match, dateString);
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
async function convertArticleToMarkdown(article, downloadImages = null) {
  const options = await getOptions();
  if (downloadImages != null) {
    options.downloadImages = downloadImages;
  }

  // substitute front and backmatter templates if necessary
  if (options.includeTemplate) {
    options.frontmatter = textReplace(options.frontmatter, article) + '\n';
    options.backmatter = '\n' + textReplace(options.backmatter, article);
  }
  else {
    options.frontmatter = options.backmatter = '';
  }

  options.imagePrefix = textReplace(options.imagePrefix, article)
    .split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');

  return turndown(article.content, options);
}

// function to turn the title into a valid file name
function generateValidFileName(title, disallowedChars = null) {
  // remove < > : " / \ | ? * 
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  // and non-breaking spaces (thanks @Licat)
  var name = title.replaceAll(illegalRe, "").replaceAll('\u00A0', ' ');

  if (disallowedChars) {
    for (let c of disallowedChars) {
      name = name.replaceAll(c, '');
    }
  }

  return name;
}

// function to actually download the markdown file
async function downloadMarkdown(markdown, title, tabId, imageList = {}) {
  if (browser.downloads) {
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
        filename: title + ".md",
        saveAs: options.saveAs
      });
      // add a listener for the download completion
      browser.downloads.onChanged.addListener((delta) => {
        if (delta.state && delta.state.current == "complete") {
          if (delta.id === id) {
            //release the url for the blob
            window.URL.revokeObjectURL(url);
            Object.entries(imageList).forEach(([src, filename]) => {
              browser.downloads.download({
                url: src,
                filename: filename,
                saveAs: false
              })
            })
          }
        }
      });
    }
    catch (err) {
      console.error("Download failed" + err);
    }
  }
  else {

    try {
      const options = await getOptions();
      await ensureScripts(tabId);
      const filename = generateValidFileName(title, options.disallowedChars) + ".md";
      const code = `downloadMarkdown("${filename}","${base64EncodeUnicode(markdown)}");`
      console.log("code",code);
      await browser.tabs.executeScript(tabId, {code: code});
    }
    catch (error) {
      // This could happen if the extension is not allowed to run code in
      // the page, for example if the tab is a privileged page.
      console.error("Failed to execute script: " + error);
    };
  }
}

function base64EncodeUnicode(str) {
  // Firstly, escape the string using encodeURIComponent to get the UTF-8 encoding of the characters, 
  // Secondly, we convert the percent encodings into raw bytes, and add it to btoa() function.
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  });

  return btoa(utf8Bytes);
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
    const { markdown, imageList } = await convertArticleToMarkdown(article);
    // format the title
    article.title = await formatTitle(article);
    // display the data in the popup
    await browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article, imageList: imageList });
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title, message.tab.id, message.imageList);
  }
}

// create the context menus
async function createMenus() {
  const options = await getOptions();

  browser.contextMenus.removeAll();

  // tab menu (chrome does not support this)
  try {
    browser.contextMenus.create({
      id: "download-markdown-tab",
      title: "Download Tab as Markdown",
      contexts: ["tab"]
    }, () => {});

    browser.contextMenus.create({
      id: "tab-download-markdown-alltabs",
      title: "Download All Tabs as Markdown",
      contexts: ["tab"]
    }, () => {});

    browser.contextMenus.create({
      id: "copy-tab-as-markdown-link-tab",
      title: "Copy Tab URL as Markdown Link",
      contexts: ["tab"]
    }, () => {});

    browser.contextMenus.create({
      id: "tab-separator-1",
      type: "separator",
      contexts: ["tab"]
    }, () => { });

    browser.contextMenus.create({
      id: "tabtoggle-includeTemplate",
      type: "checkbox",
      title: "Include front/back template",
      contexts: ["tab"],
      checked: options.includeTemplate
    }, () => { });
  } catch {

  }
  // add the download all tabs option to the page context menu as well
  browser.contextMenus.create({
    id: "download-markdown-alltabs",
    title: "Download All Tabs as Markdown",
    contexts: ["all"]
  }, () => { });
  browser.contextMenus.create({
    id: "separator-0",
    type: "separator",
    contexts: ["all"]
  }, () => {});

  // download actions
  browser.contextMenus.create({
    id: "download-markdown-selection",
    title: "Download Selection As Markdown",
    contexts: ["selection"]
  }, () => {});
  browser.contextMenus.create({
    id: "download-markdown-all",
    title: "Download Tab As Markdown",
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
    title: "Copy Tab As Markdown",
    contexts: ["all"]
  }, () => { });
  browser.contextMenus.create({
    id: "copy-tab-as-markdown-link",
    title: "Copy Tab URL as Markdown Link",
    contexts: ["all"]
  }, () => {});
  
  browser.contextMenus.create({
    id: "separator-2",
    type: "separator",
    contexts: ["all"]
  }, () => { });
  
  // options
  browser.contextMenus.create({
    id: "toggle-includeTemplate",
    type: "checkbox",
    title: "Include front/back template",
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
  else if (info.menuItemId == "download-markdown-alltabs" || info.menuItemId == "tab-download-markdown-alltabs") {
    downloadMarkdownForAllTabs(info);
  }
  // one of the download commands
  else if (info.menuItemId.startsWith("download-markdown")) {
    downloadMarkdownFromContext(info, tab);
  }
  // copy tab as markdown link
  else if (info.menuItemId.startsWith("copy-tab-as-markdown-link")) {
    copyTabAsMarkdownLink(tab);
  }
  // a settings toggle command
  else if (info.menuItemId.startsWith("toggle-") || info.menuItemId.startsWith("tabtoggle-")) {
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
    if (setting == "includeTemplate") {
      browser.contextMenus.update("toggle-includeTemplate", {
        checked: options.includeTemplate
      });
      try {
        browser.contextMenus.update("tabtoggle-includeTemplate", {
          checked: options.includeTemplate
        });
      } catch { }
    }
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
  // also grab the page title
  article.pageTitle = dom.title;

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
  let options = defaultOptions;
  try {
    options = await getOptions();
  }
  catch (err) {
    options = defaultOptions
  }
  
  let title = textReplace(options.title, article)
  title = title.split('/').map(s=>generateValidFileName(s, options.disallowedChars)).join('/');
  return title;
}

// function to download markdown, triggered by context menu
async function downloadMarkdownFromContext(info, tab) {
  await ensureScripts(tab.id);
  const article = await getArticleFromContent(tab.id, info.menuItemId == "download-markdown-selection");
  const title = await formatTitle(article);
  const { markdown, imageList } = await convertArticleToMarkdown(article);
  await downloadMarkdown(markdown, title, tab.id, imageList); 

}

// function to copy a tab url as a markdown link
async function copyTabAsMarkdownLink(tab) {
  try {
    await ensureScripts(tab.id);
    const article = await getArticleFromContent(tab.id);
    const title = await formatTitle(article);
    //await browser.tabs.executeScript(tab.id, { code: `copyToClipboard("[${title}](${article.baseURI})")` });
    await navigator.clipboard.writeText(`[${title}](${article.baseURI})`);
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy as markdown link: " + error);
  };
}

// function to copy markdown to the clipboard, triggered by context menu
async function copyMarkdownFromContext(info, tab) {
  try{
    await ensureScripts(tab.id);
    if (info.menuItemId == "copy-markdown-link") {
      const options = await getOptions();
      options.frontmatter = options.backmatter = '';
      const { markdown } = turndown(`<a href="${info.linkUrl}">${info.linkText}</a>`, { ...options, downloadImages: false });
      //await browser.tabs.executeScript(tab.id, {code: `copyToClipboard(${JSON.stringify(markdown)})`});
      await navigator.clipboard.writeText(markdown);
    }
    else if (info.menuItemId == "copy-markdown-image") {
      await browser.tabs.executeScript(tab.id, {code: `copyToClipboard("![](${info.srcUrl})")`});
      await navigator.clipboard.writeText(`![](${info.srcUrl})`);
    }
    else {
      const article = await getArticleFromContent(tab.id, info.menuItemId == "copy-markdown-selection");
      const { markdown } = await convertArticleToMarkdown(article, downloadImages = false);
      //await browser.tabs.executeScript(tab.id, { code: `copyToClipboard(${JSON.stringify(markdown)})` });
      await navigator.clipboard.writeText(markdown);
    }
  }
  catch (error) {
    // This could happen if the extension is not allowed to run code in
    // the page, for example if the tab is a privileged page.
    console.error("Failed to copy text: " + error);
  };
}

async function downloadMarkdownForAllTabs(info) {
  const tabs = await browser.tabs.query({
    currentWindow: true
  });
  tabs.forEach(tab => {
    downloadMarkdownFromContext(info, tab);
  });
}
