"use strict";

const URL = window.location.search.substr(1);

document.title = `view-source:${URL}`;

fetch(URL)
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
