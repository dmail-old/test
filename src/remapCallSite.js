// https://github.com/dmail-old/node-sourcemap/blob/master/index.js

import { SourceMapConsumer } from "source-map"
import fs from "fs"
import url from "url"

const fileContentsCache = {}
const sourceMapCache = {}
const reSourceMap = /^data:application\/json[^,]+base64,/

const readFile = (path) => {
	let contents

	try {
		contents = fs.readFileSync(path, "utf8")
	} catch (e) {
		contents = null
	}

	return contents
}

const retrieveFile = (path) => {
	path = path.trim()
	if (path in fileContentsCache) {
		return fileContentsCache[path]
	}

	const contents = readFile(path)
	fileContentsCache[path] = contents

	return contents
}

const supportRelativeURL = (file, base) => {
	return file ? url.resolve(file, base) : base
}

const retrieveSourceMapURL = (source) => {
	const fileData = retrieveFile(source)
	//        //# sourceMappingURL=foo.js.map                       /*# sourceMappingURL=foo.js.map */
	var re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/gm
	// Keep executing the search to find the *last* sourceMappingURL to avoid
	// picking up sourceMappingURLs from comments, strings, etc.
	let lastMatch
	let match
	while ((match = re.exec(fileData))) {
		lastMatch = match
	}

	return lastMatch ? lastMatch[1] : null
}

const retrieveSourceMap = (source) => {
	var sourceMappingURL = retrieveSourceMapURL(source)
	if (!sourceMappingURL) {
		return null
	}

	// Read the contents of the source map
	let sourceMapData
	if (reSourceMap.test(sourceMappingURL)) {
		// Support source map URL as a data url
		const rawData = sourceMappingURL.slice(sourceMappingURL.indexOf(",") + 1)
		sourceMapData = new Buffer(rawData, "base64").toString()
		sourceMappingURL = null
	} else {
		// Support source map URLs relative to the source URL
		sourceMappingURL = supportRelativeURL(source, sourceMappingURL)
		sourceMapData = retrieveFile(sourceMappingURL)
	}

	if (!sourceMapData) {
		return null
	}

	return {
		url: sourceMappingURL,
		map: sourceMapData,
	}
}

const mapSourcePosition = (position) => {
	let sourceMap = sourceMapCache[position.source]
	if (!sourceMap) {
		// Call the (overrideable) retrieveSourceMap function to get the source map.
		const urlAndMap = retrieveSourceMap(position.source)

		if (urlAndMap) {
			sourceMap = sourceMapCache[position.source] = {
				url: urlAndMap.url,
				map: new SourceMapConsumer(urlAndMap.map),
			}

			// Load all sources stored inline with the source map into the file cache
			// to pretend like they are already loaded. They may not exist on disk.
			if (sourceMap.map.sourcesContent) {
				sourceMap.map.sources.forEach(function(source, i) {
					var contents = sourceMap.map.sourcesContent[i]
					if (contents) {
						var url = supportRelativeURL(sourceMap.url, source)
						fileContentsCache[url] = contents
					}
				})
			}
		} else {
			sourceMap = sourceMapCache[position.source] = {
				url: null,
				map: null,
			}
		}
	}

	// Resolve the source URL relative to the URL of the source map
	if (sourceMap && sourceMap.map) {
		const originalPosition = sourceMap.map.originalPositionFor(position)

		// Only return the original position if a matching line was found. If no
		// matching line is found then we return position instead, which will cause
		// the stack trace to print the path and line for the compiled file. It is
		// better to give a precise location in the compiled file than a vague
		// location in the original file.
		if (originalPosition.source !== null) {
			originalPosition.source = supportRelativeURL(
				sourceMap.url || position.source,
				originalPosition.source,
			)
			return originalPosition
		}
	}

	return position
}

const remapPosition = ({ source, line, column }, callSites) => {
	if (!source) {
		return {
			source,
			line,
			column,
		}
	}

	// Fix position in Node where some (internal) code is prepended.
	// See https://github.com/evanw/node-source-map-support/issues/36
	const fromModule =
		typeof process !== "undefined" &&
		callSites.length &&
		callSites[callSites.length - 1].getFileName() === "module.js"

	if (fromModule && line === 1) {
		column -= 63
	}

	return mapSourcePosition({
		source,
		line,
		column,
	})
}

export const remap = (callSite, callSites = []) => {
	const source = callSite.getScriptNameOrSourceURL() || callSite.getFileName()
	const line = callSite.getLineNumber()
	const column = callSite.getColumnNumber() - 1
	const position = remapPosition({ source, line, column }, callSites)

	return {
		getFileName: () => position.source,
		getLineNumber: () => position.line,
		getColumnNumber: () => position.column + 1,
	}

	/*
	if( callSite.isEval() ){
		console.log('handling isEval calls');

		var evalOrigin = callSite.getEvalOrigin();
		var evalSsource = evalOrigin.getFileName() || evalOrigin.getScriptNameOrSourceURL();
		var evalLine = evalOrigin.getLineNumber();
		var evalColumn = evalOrigin.getColumnNumber() - 1;

		var evalPosition =  mapSourcePosition({
			source: source,
			line: evalSsource,
			column: evalColumn
		});

		callSite.evalFileName = evalPosition.source;
		callSite.evalLineNumber = evalPosition.line;
		callSite.evalColumnNumber = evalPosition.column + 1;
	}
	*/

	// Code called using eval() needs special handling
	/*
	if( callSite.isEval() ){
		var evalOrigin = callSite.getEvalOrigin();

		if( evalOrigin ){
			mapCallSite(evalOrigin);
		}
	}
	*/

	// console.log('mapping', source, 'into', callSite.source);
}
