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
  backmatter: ""
}

// convert the article content to markdown using Turndown
function convertArticleToMarkdownForReal(content, options) {
  var turndownService = new TurndownService(options);
  var markdown = options.frontmatter + '\n' + turndownService.turndown(content)
    + '\n' + options.backmatter;
  return markdown;
}

function textReplace(string, article, dom) {
  for (const key in article) {
    if (article.hasOwnProperty(key) && key != "content") {
      string = string.split('{' + key + '}').join(article[key]);
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
      frontmatter: textReplace(options.frontmatter, article, dom),
      backmatter: textReplace(options.backmatter, article, dom),
    }
    return convertArticleToMarkdownForReal(article.content, testOptions);
  }

  const onError = error => {
    console.log(error);
    return convertArticleToMarkdownForReal(article.content, {
      ...defaultOptions,
      frontmatter: textReplace(defaultOptions.frontmatter, article, dom),
      backmatter: textReplace(defaultOptions.backmatter, article, dom),
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