"use strict";

window.addEventListener("keydown", event => {
	if (event.code !== "KeyU" || !event.metaKey || !event.altKey)
		return;

	event.preventDefault();

	safari.self.tab.dispatchMessage("view-page-source");
});
