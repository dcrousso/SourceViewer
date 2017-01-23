"use strict";

const LINK = document.createElement("a");
LINK.href = decodeURIComponent(window.location.search.substr(1));

const SETTINGS = JSON.parse(decodeURIComponent(window.location.hash.substr(1)));

document.title = `view-source:${LINK.href}`;

document.body.addEventListener("click", event => {
	if (!event || !event.target || !event.target.classList.contains("cm-link"))
		return;

	let newTabURL = event.target.textContent;
	if (!/^(?:[a-zA-Z]+:)\/\//.test(newTabURL)) {
		if (newTabURL.startsWith("//"))
			newTabURL = LINK.protocol + newTabURL;
		else if (newTabURL.startsWith("/"))
			newTabURL = LINK.protocol + "//" + LINK.host + newTabURL;
		else {
			let path = LINK.protocol + "//" + LINK.host + LINK.pathname;
			newTabURL = path.substr(0, path.lastIndexOf("/") + 1) + newTabURL;
		}
	}

	safari.self.tab.dispatchMessage("open-link", newTabURL);
});

let xhr = new XMLHttpRequest;
xhr.addEventListener("load", event => {
	if (xhr.status === 200) {
		let dom = (new DOMParser).parseFromString(xhr.response, "text/html");
		let base = Array.from(dom.getElementsByTagName("base")).pop();
		if (base)
			LINK.href = base.href;
	}

	CodeMirror(document.body, {
		cursorBlinkRate: -1,
		lineNumbers: true,
		lineWrapping: SETTINGS["lineWrapping"],
		maxHighlightLength: Infinity,
		mode: SETTINGS["highlightSyntax"] ? "htmlmixed" : null,
		readOnly: true,
		showWhitespaceCharacters: SETTINGS["showWhitespaceCharacters"],
		value: xhr.status === 200 ? xhr.response : `Unable to load "${LINK.href}"`,
	});
});
xhr.open("GET", LINK.href, true);
xhr.send();
