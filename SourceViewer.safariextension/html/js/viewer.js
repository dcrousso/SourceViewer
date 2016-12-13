"use strict";

const LINK = document.createElement("a");
LINK.href = window.location.search.substr(1);

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
		else
			newTabURL = LINK.href + newTabURL;
	}

	safari.self.tab.dispatchMessage("open-link", newTabURL);
});

fetch(LINK.href)
.then(response => response.text())
.then(text => {
	CodeMirror(document.body, {
		cursorBlinkRate: -1,
		lineNumbers: true,
		lineWrapping: true,
		maxHighlightLength: Infinity,
		mode: "htmlmixed",
		readOnly: true,
		value: text,
	});
});
