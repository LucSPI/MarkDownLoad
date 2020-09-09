# MarkDownload - Markdown Web Clipper

This is an extension to clip websites and download them into a readable markdown file. Please keep in mind that it is not guaranteed to work on all websites.

To use this add-on, simply click the add-on icon while you are browsing the page you want to save offline. A popup will show the rendered markdown so you can make minor edits or copy the text, or you can click the download button to download an .md file.  
Selecting text will allow you to download just the selected text

## Context Menus
You can also right-click on pages, images, links and selections to copy or download snippets of Markdown.  
You can also download all tabs in a window as Markdown files

It uses the following libraries:
- [Readability.js](https://github.com/mozilla/readability) by Mozilla in version from commit [52ab9b5c8916c306a47b2119270dcdabebf9d203](https://github.com/mozilla/readability/commit/52ab9b5c8916c306a47b2119270dcdabebf9d203#diff-06d8d22df421dacde90a2268083424ab). This library is also used for the Firefox Reader View and it simplifies the page so that only the important parts are clipped. (Licensed under Apache License Version 2.0)
- [Turndown](https://github.com/domchristie/turndown) by Dom Christie in version 6.0.0 is used to convert the simplified HTML (from Readability.js) into markdown. (Licensed under MIT License)
- [Moment.js](https://momentjs.com) version 2.27.0 used to format dates in template variables

# Permissions
- Data on all sites: used to enable "Download All Tabs" functionality - no other data is captured or sent online
- Access tabs: used to access the website content when the icon in the browser bar is clicked.
- Manage Downloads: necessary to be able to download the markdown file.
- Storage: used to save extension options
- Clipboard: used to copy Markdown to clipboard

# Installation
The plugin is available for [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/markdownload/), [Google Chrome](https://chrome.google.com/webstore/detail/markdownload-markdown-web/pcmpcfapbekmbjjkdalcgopdkipoggdi) and [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/hajanaajapkhaabfcofdjgjnlgkdkknm).

--- 
The Common Mark icon courtesy of https://github.com/dcurtis/markdown-mark
