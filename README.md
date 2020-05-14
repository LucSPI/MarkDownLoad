# markdown-clipper

This is a Firefox and Google Chrome extension to clip websites and download them into a readable markdown file.  
It will now display the markdown in a popup, with an option to download the file (or just copy paste the text you want).

It uses the following two libraries:
- [Readability.js](https://github.com/mozilla/readability) by Mozilla in version from commit [52ab9b5c8916c306a47b2119270dcdabebf9d203](https://github.com/mozilla/readability/commit/52ab9b5c8916c306a47b2119270dcdabebf9d203#diff-06d8d22df421dacde90a2268083424ab). This library is also used for the Firefox Reader View and it simplifies the page so that only the important parts are clipped. (Licensed under Apache License Version 2.0)
- [Turndown](https://github.com/domchristie/turndown) by Dom Christie in version 6.0.0 is used to convert the simplified HTML (from Readability.js) into markdown. (Licensed under MIT License)

# Installation
The plugin is available for [Firefox](https://addons.mozilla.org/en-GB/firefox/addon/markdownload/) and coming soon for [Google Chrome]().  

# Permissions
- Access tabs: used to access the website content when the icon in the browser bar is clicked.
- Manage Downloads: neccessary to be able to download the markdown file.

--- 
The Common Mark icon courtesy of https://github.com/dcurtis/markdown-mark
