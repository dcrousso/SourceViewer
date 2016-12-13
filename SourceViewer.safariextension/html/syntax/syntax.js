/*
 * Copied from:
 *  - https://trac.webkit.org/browser/trunk/Source/WebInspectorUI/UserInterface/Views/CodeMirrorAdditions.js
 */

"use strict";

function tokenizeLinkString(stream, state) {
	// Eat the string until the same quote is found that started the string.
	// If this is unquoted, then eat until whitespace or common parse errors.
	if (state._linkQuoteCharacter)
		stream.eatWhile(new RegExp("[^" + state._linkQuoteCharacter + "]"));
	else
		stream.eatWhile(/[^\s\u00a0=<>\"\']/);

	// If the stream isn't at the end of line then we found the end quote.
	// In the case, change _linkTokenize to parse the end of the link next.
	// Otherwise _linkTokenize will stay as-is to parse more of the link.
	if (!stream.eol())
		state._linkTokenize = tokenizeEndOfLinkString;

	return "link";
}

function tokenizeEndOfLinkString(stream, state) {
	// Eat the quote character to style it with the base style.
	if (state._linkQuoteCharacter)
		stream.eat(state._linkQuoteCharacter);

	let style = state._linkBaseStyle;

	// Clean up the state.
	delete state._linkTokenize;
	delete state._linkQuoteCharacter;
	delete state._linkBaseStyle;
	delete state._srcSetTokenizeState;

	return style;
}

function tokenizeSrcSetString(stream, state) {
	if (state._srcSetTokenizeState === "link") {
		// Eat the string until a space, comma, or ending quote.
		// If this is unquoted, then eat until whitespace or common parse errors.
		if (state._linkQuoteCharacter)
			stream.eatWhile(new RegExp("[^\\s," + state._linkQuoteCharacter + "]"));
		else
			stream.eatWhile(/[^\s,\u00a0=<>\"\']/);
	} else {
		// Eat the string until a comma, or ending quote.
		// If this is unquoted, then eat until whitespace or common parse errors.
		stream.eatSpace();
		if (state._linkQuoteCharacter)
			stream.eatWhile(new RegExp("[^," + state._linkQuoteCharacter + "]"));
		else
			stream.eatWhile(/[^\s\u00a0=<>\"\']/);
		stream.eatWhile(/[\s,]/);
	}

	// If the stream isn't at the end of line and we found the end quote
	// change _linkTokenize to parse the end of the link next. Otherwise
	// _linkTokenize will stay as-is to parse more of the srcset.
	if (stream.eol() || (!state._linkQuoteCharacter || stream.peek() === state._linkQuoteCharacter))
		state._linkTokenize = tokenizeEndOfLinkString;

	// Link portion.
	if (state._srcSetTokenizeState === "link") {
		state._srcSetTokenizeState = "descriptor";
		return "link";
	}

	// Descriptor portion.
	state._srcSetTokenizeState = "link";
	return state._linkBaseStyle;
}

function extendedXMLToken(stream, state) {
	if (state._linkTokenize) {
		// Call the link tokenizer instead.
		let style = state._linkTokenize(stream, state);
		return style && (style + " m-" + this.name);
	}

	// Remember the start position so we can rewind if needed.
	let startPosition = stream.pos;
	let style = this._token(stream, state);
	if (style === "attribute") {
		// Look for "href" or "src" attributes. If found then we should
		// expect a string later that should get the "link" style instead.
		let text = stream.current().toLowerCase();
		if (text === "src" || /\bhref\b/.test(text))
			state._expectLink = true;
		else if (text === "srcset")
			state._expectSrcSet = true;
		else {
			delete state._expectLink;
			delete state._expectSrcSet;
		}
	} else if (state._expectLink && style === "string") {
		let current = stream.current();

		// Unless current token is empty quotes, consume quote character
		// and tokenize link next.
		if (current !== "\"\"" && current !== "''") {
			delete state._expectLink;

			// This is a link, so setup the state to process it next.
			state._linkTokenize = tokenizeLinkString;
			state._linkBaseStyle = style;

			// The attribute may or may not be quoted.
			let quote = current[0];

			state._linkQuoteCharacter = quote === "'" || quote === "\"" ? quote : null;

			// Rewind the stream to the start of this token.
			stream.pos = startPosition;

			// Eat the open quote of the string so the string style
			// will be used for the quote character.
			if (state._linkQuoteCharacter)
				stream.eat(state._linkQuoteCharacter);
		}
	} else if (state._expectSrcSet && style === "string") {
		let current = stream.current();

		// Unless current token is empty quotes, consume quote character
		// and tokenize link next.
		if (current !== "\"\"" && current !== "''") {
			delete state._expectSrcSet;

			// This is a link, so setup the state to process it next.
			state._srcSetTokenizeState = "link";
			state._linkTokenize = tokenizeSrcSetString;
			state._linkBaseStyle = style;

			// The attribute may or may not be quoted.
			let quote = current[0];

			state._linkQuoteCharacter = quote === "'" || quote === "\"" ? quote : null;

			// Rewind the stream to the start of this token.
			stream.pos = startPosition;

			// Eat the open quote of the string so the string style
			// will be used for the quote character.
			if (state._linkQuoteCharacter)
				stream.eat(state._linkQuoteCharacter);
		}
	} else if (style) {
		// We don't expect other tokens between attribute and string since
		// spaces and the equal character are not tokenized. So if we get
		// another token before a string then we stop expecting a link.
		delete state._expectLink;
		delete state._expectSrcSet;
	}

	return style && (style + " m-" + this.name);
}

function tokenizeCSSURLString(stream, state) {
	// If we are an unquoted url string, return whitespace blocks as a whitespace token (null).
	if (state._unquotedURLString && stream.eatSpace())
		return null;

	let ch = null;
	let escaped = false;
	let reachedEndOfURL = false;
	let lastNonWhitespace = stream.pos;
	let quote = state._urlQuoteCharacter;

	// Parse characters until the end of the stream/line or a proper end quote character.
	while ((ch = stream.next()) != null) {
		if (ch === quote && !escaped) {
			reachedEndOfURL = true;
			break;
		}
		escaped = !escaped && ch === "\\";
		if (!/[\s\u00a0]/.test(ch))
			lastNonWhitespace = stream.pos;
	}

	// If we are an unquoted url string, do not include trailing whitespace, rewind to the last real character.
	if (state._unquotedURLString)
		stream.pos = lastNonWhitespace;

	// If we have reached the proper the end of the url string, switch to the end tokenizer to reset the state.
	if (reachedEndOfURL) {
		if (!state._unquotedURLString)
			stream.backUp(1);
		this._urlTokenize = tokenizeEndOfCSSURLString;
	}

	return "link";
}

function tokenizeEndOfCSSURLString(stream, state) {
	// Eat the quote character to style it with the base style.
	if (!state._unquotedURLString)
		stream.eat(state._urlQuoteCharacter);

	let style = state._urlBaseStyle;

	delete state._urlTokenize;
	delete state._urlQuoteCharacter;
	delete state._urlBaseStyle;

	return style;
}

function extendedCSSToken(stream, state) {
	let hexColorRegex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

	if (state._urlTokenize) {
		// Call the link tokenizer instead.
		let style = state._urlTokenize(stream, state);
		return style && (style + " m-" + (this.alternateName || this.name));
	}

	// Remember the start position so we can rewind if needed.
	let startPosition = stream.pos;
	let style = this._token(stream, state);

	if (style) {
		if (style === "atom") {
			if (stream.current() === "url") {
				// If the current text is "url" then we should expect the next string token to be a link.
				state._expectLink = true;
			} else if (hexColorRegex.test(stream.current()))
				style = style + " hex-color";
		} else if (state._expectLink) {
			delete state._expectLink;

			if (style === "string") {
				// This is a link, so setup the state to process it next.
				state._urlTokenize = tokenizeCSSURLString;
				state._urlBaseStyle = style;

				// The url may or may not be quoted.
				let quote = stream.current()[0];
				state._urlQuoteCharacter = quote === "'" || quote === "\"" ? quote : ")";
				state._unquotedURLString = state._urlQuoteCharacter === ")";

				// Rewind the stream to the start of this token.
				stream.pos = startPosition;

				// Eat the open quote of the string so the string style
				// will be used for the quote character.
				if (!state._unquotedURLString)
					stream.eat(state._urlQuoteCharacter);
			}
		}
	}

	return style && (style + " m-" + (this.alternateName || this.name));
}

function extendedToken(stream, state) {
	// CodeMirror moves the original token function to _token when we extended it.
	// So call it to get the style that we will add an additional class name to.
	let style = this._token(stream, state);
	return style && (style + " m-" + (this.alternateName || this.name));
}

CodeMirror.extendMode("css", {
	token: extendedCSSToken,
});

CodeMirror.extendMode("xml", {
	token: extendedXMLToken,
});

CodeMirror.extendMode("javascript", {
	token: extendedToken,
});

const maximumNeighboringWhitespaceCharacters = 16;
CodeMirror.defineOption("showWhitespaceCharacters", false, function(cm, value, old) {
	if (!value || (old && old !== CodeMirror.Init)) {
		cm.removeOverlay("whitespace");
		return;
	}

	cm.addOverlay({
		name: "whitespace",
		token(stream) {
			if (stream.peek() === " ") {
				let count = 0;
				while (count < maximumNeighboringWhitespaceCharacters && stream.peek() === " ") {
					++count;
					stream.next();
				}
				return `whitespace whitespace-${count}`;
			}

			while (!stream.eol() && stream.peek() !== " ")
				stream.next();

			return null;
		},
	});
});
