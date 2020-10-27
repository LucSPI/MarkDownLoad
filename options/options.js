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
    includeTemplate: false,
    frontmatter: "{baseURI}\n\n> {excerpt}\n\n# {title}",
    backmatter: "",
    title: "{title}",
    saveAs: false,
    downloadImages: false,
    imagePrefix: '{title}/'
}


const saveOptions = e => {
    e.preventDefault();

    const options = {
        frontmatter: document.getElementById("frontmatter").innerText,
        backmatter: document.getElementById("backmatter").innerText,
        title: document.getElementById("title").value,
        includeTemplate: document.getElementById("includeTemplate").checked,
        saveAs: document.getElementById("saveAs").checked,
        downloadImages: document.getElementById("downloadImages").checked,
        imagePrefix: document.getElementById("imagePrefix").value,

        headingStyle: getCheckedValue(document.querySelectorAll("input[name='headingStyle']")),
        hr: getCheckedValue(document.querySelectorAll("input[name='hr']")),
        bulletListMarker: getCheckedValue(document.querySelectorAll("input[name='bulletListMarker']")),
        codeBlockStyle: getCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']")),
        fence: getCheckedValue(document.querySelectorAll("input[name='fence']")),
        emDelimiter: getCheckedValue(document.querySelectorAll("input[name='emDelimiter']")),
        strongDelimiter: getCheckedValue(document.querySelectorAll("input[name='strongDelimiter']")),
        linkStyle: getCheckedValue(document.querySelectorAll("input[name='linkStyle']")),
        linkReferenceStyle: getCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']"))
    }

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
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = "Options saved.";
                statusEl.classList.remove('error');
                statusEl.classList.add('success');
            });
        })
        .catch(err => {
            document.querySelectorAll(".status").forEach(statusEl => {
                statusEl.textContent = err;
                statusEl.classList.remove('success');
                statusEl.classList.add('error');
            });
        });
}

const restoreOptions = () => {
    const setCurrentChoice = result => {
        document.getElementById("frontmatter").innerText = result.frontmatter;
        document.getElementById("backmatter").innerText = result.backmatter;
        document.getElementById("title").value = result.title;
        document.getElementById("includeTemplate").checked = result.includeTemplate;
        document.getElementById("saveAs").checked = result.saveAs;
        document.getElementById("downloadImages").checked = result.downloadImages;
        document.getElementById("imagePrefix").value = result.imagePrefix;

        setCheckedValue(document.querySelectorAll("input[name='headingStyle']"), result.headingStyle);
        setCheckedValue(document.querySelectorAll("input[name='hr']"), result.hr);
        setCheckedValue(document.querySelectorAll("input[name='bulletListMarker']"), result.bulletListMarker);
        setCheckedValue(document.querySelectorAll("input[name='codeBlockStyle']"), result.codeBlockStyle);
        setCheckedValue(document.querySelectorAll("input[name='fence']"), result.fence);
        setCheckedValue(document.querySelectorAll("input[name='emDelimiter']"), result.emDelimiter);
        setCheckedValue(document.querySelectorAll("input[name='strongDelimiter']"), result.strongDelimiter);
        setCheckedValue(document.querySelectorAll("input[name='linkStyle']"), result.linkStyle);
        setCheckedValue(document.querySelectorAll("input[name='linkReferenceStyle']"), result.linkReferenceStyle);
    }

    const onError = error => {
        console.error(error);
    }

    browser.storage.sync.get(defaultOptions).then(setCurrentChoice, onError);
}

document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelectorAll(".save").forEach(el => el.addEventListener("click", saveOptions));

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