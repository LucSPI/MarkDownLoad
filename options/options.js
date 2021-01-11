// these are the default options
const defaultOptions = {
    headingStyle: "atx",
    hr: "***",
    bulletListMarker: "*",
    codeBlockStyle: "indented",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    imageStyle: "markdown",
    frontmatter: "# {pageTitle}\n\n---\n\ncreated: {date:YYYY-MM-DDTHH:mm:ss} (UTC {date:Z})\ntags: #nessy \nsource: {baseURI}\n\n---\n\n> ## Excerpt\n> {excerpt}\n\n---",
    backmatter: "---",
    title: "{pageTitle}",
    includeTemplate: true,
    saveAs: false,
    downloadImages: true,
    mdClipsFolder: 'MDClips',
    imagePrefix: '_resources/{pageTitle}/',
    disallowedChars: '[]#^'
}

let options = defaultOptions;
let keyupTimeout = null;


const saveOptions = e => {
    e.preventDefault();

    options = {
        frontmatter: document.querySelector("[name='frontmatter']").value,
        backmatter: document.querySelector("[name='backmatter']").value,
        title: document.querySelector("[name='title']").value,
        disallowedChars: document.querySelector("[name='disallowedChars']").value,
        includeTemplate: document.querySelector("[name='includeTemplate']").checked,
        saveAs: document.querySelector("[name='saveAs']").checked,
        downloadImages: document.querySelector("[name='downloadImages']").checked,
        imagePrefix: document.querySelector("[name='imagePrefix']").value,
        mdClipsFolder: document.querySelector("[name='mdClipsFolder']").value,

        headingStyle: getCheckedValue(document.querySelectorAll("input[name='headingStyle']")),
        hr: getCheckedValue(document.querySelectorAll("input[name='hr']")),
        bulletListMarker: getCheckedValue(document.querySelectorAll("input[name='bulletListMarker']")),
        codeBlockStyle: getCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']")),
        fence: getCheckedValue(document.querySelectorAll("input[name='fence']")),
        emDelimiter: getCheckedValue(document.querySelectorAll("input[name='emDelimiter']")),
        strongDelimiter: getCheckedValue(document.querySelectorAll("input[name='strongDelimiter']")),
        linkStyle: getCheckedValue(document.querySelectorAll("input[name='linkStyle']")),
        linkReferenceStyle: getCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']")),
        imageStyle: getCheckedValue(document.querySelectorAll("input[name='imageStyle']")),
    }

    save();
}

const save = () => {
    const spinner = document.getElementById("spinner");
    spinner.style.display = "block";
    browser.storage.sync.set(options)
        .then(() => {
            browser.contextMenus.update("toggle-includeTemplate", {
                checked: options.includeTemplate
            });
            try {
                browser.contextMenus.update("tabtoggle-includeTemplate", {
                    checked: options.includeTemplate
                });
            } catch { }
        })
        .then(() => {
            spinner.style.display = "none";
        })
        .catch(err => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = err;
                statusEl.classList.remove('success');
                statusEl.classList.add('error');
            });
            spinner.style.display = "none";
        });
}

const restoreOptions = () => {
    const setCurrentChoice = result => {
        options = result;
        document.querySelector("[name='frontmatter']").value = result.frontmatter;
        textareaInput.bind(document.querySelector("[name='frontmatter']"))();
        document.querySelector("[name='backmatter']").value = result.backmatter;
        textareaInput.bind(document.querySelector("[name='backmatter']"))();
        document.querySelector("[name='title']").value = result.title;
        document.querySelector("[name='disallowedChars']").value = result.disallowedChars;
        document.querySelector("[name='includeTemplate']").checked = result.includeTemplate;
        document.querySelector("[name='saveAs']").checked = result.saveAs;
        document.querySelector("[name='downloadImages']").checked = result.downloadImages;
        document.querySelector("[name='imagePrefix']").value = result.imagePrefix;
        document.querySelector("[name='mdClipsFolder']").value = result.mdClipsFolder;

        setCheckedValue(document.querySelectorAll("[name='headingStyle']"), result.headingStyle);
        setCheckedValue(document.querySelectorAll("[name='hr']"), result.hr);
        setCheckedValue(document.querySelectorAll("[name='bulletListMarker']"), result.bulletListMarker);
        setCheckedValue(document.querySelectorAll("[name='codeBlockStyle']"), result.codeBlockStyle);
        setCheckedValue(document.querySelectorAll("[name='fence']"), result.fence);
        setCheckedValue(document.querySelectorAll("[name='emDelimiter']"), result.emDelimiter);
        setCheckedValue(document.querySelectorAll("[name='strongDelimiter']"), result.strongDelimiter);
        setCheckedValue(document.querySelectorAll("[name='linkStyle']"), result.linkStyle);
        setCheckedValue(document.querySelectorAll("[name='linkReferenceStyle']"), result.linkReferenceStyle);
        setCheckedValue(document.querySelectorAll("[name='imageStyle']"), result.imageStyle);

        if (options.linkStyle == "inlined") {
            document.getElementById("linkReferenceStyle").style.height = 0;
            document.getElementById("linkReferenceStyle").style.opacity = 0;
        }
        if (options.codeBlockStyle == "indented") {
            document.getElementById("fence").style.height = 0;
            document.getElementById("fence").style.opacity = 0;
        }
        if (!options.downloadImages) {
            document.getElementById("imagePrefix").style.height = 0;
            document.getElementById("imagePrefix").style.opacity = 0;
        }

        // if browser doesn't support the download api (i.e. Safari) I can't download images at this stage...
        // so hide all those settings
        if (!browser.downloads) {
            options.downloadImages = false;
            document.querySelector("[name='downloadImages']").checked = false;
            document.getElementById("imageOptions").style.display = "none";
            document.getElementById("otherOptions").style.display = "none";
        }
    }

    const onError = error => {
        console.error(error);
    }

    browser.storage.sync.get(defaultOptions).then(setCurrentChoice, onError);
}

function textareaInput(){
    this.parentNode.dataset.value = this.value;
}

const inputChange = e => {
    if (e.target.name == "linkStyle") {
        const el = document.getElementById("linkReferenceStyle");
        el.style.height = (e.target.value == "inlined") ? "0" : el.dataset.height + 'px';
        el.style.opacity = (e.target.value == "inlined") ? "0" : "1";
    }

    if (e.target.name == "codeBlockStyle") {
        const el = document.getElementById("fence");
        el.style.height = (e.target.value == "indented") ? "0" : el.dataset.height + 'px';
        el.style.opacity = (e.target.value == "indented") ? "0" :"1";
    }

    if (e.target.name == "downloadImages") {
        const el = document.getElementById("imagePrefix");
        el.style.height = (e.target.checked) ? el.dataset.height + 'px' : '0';
        el.style.opacity = (e.target.checked) ? '1' : '0';
    }

    let key = e.target.name;
    let value = e.target.value;
    if (e.target.type == "checkbox") value = e.target.checked;
    options[key] = value;
    save();
}

const inputKeyup = (e) => {
    if (keyupTimeout) clearTimeout(keyupTimeout);
    keyupTimeout = setTimeout(inputChange, 500, e);
}

const loaded = () => {
    document.querySelectorAll('.radio-container,.checkbox-container,.textbox-container').forEach(container => {
        container.dataset.height = container.clientHeight;
    });

    restoreOptions();

    document.querySelectorAll('input,textarea').forEach(input => {
        if (input.tagName == "TEXTAREA" || input.type == "text") {
            input.addEventListener('keyup', inputKeyup);
        }
        else input.addEventListener('change', inputChange);
    })
}

document.addEventListener("DOMContentLoaded", loaded);
document.querySelectorAll(".save").forEach(el => el.addEventListener("click", saveOptions));
document.querySelectorAll(".input-sizer > textarea").forEach(el => el.addEventListener("input", textareaInput));

/// https://www.somacon.com/p143.php
// return the value of the radio button that is checked
// return an empty string if none are checked, or
// there are no radio buttons
function getCheckedValue(radioObj) {
    if (!radioObj)
        return "";
    var radioLength = radioObj.length;
    if (radioLength == undefined)
        if (radioObj.checked)
            return radioObj.value;
        else
            return "";
    for (var i = 0; i < radioLength; i++) {
        if (radioObj[i].checked) {
            return radioObj[i].value;
        }
    }
    return "";
}

// set the radio button with the given value as being checked
// do nothing if there are no radio buttons
// if the given value does not exist, all the radio buttons
// are reset to unchecked
function setCheckedValue(radioObj, newValue) {
    if (!radioObj)
        return;
    var radioLength = radioObj.length;
    if (radioLength == undefined) {
        radioObj.checked = (radioObj.value == newValue.toString());
        return;
    }
    for (var i = 0; i < radioLength; i++) {
        radioObj[i].checked = false;
        if (radioObj[i].value == newValue.toString()) {
            radioObj[i].checked = true;
        }
    }
}