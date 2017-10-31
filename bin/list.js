#!/usr/bin/env node

const { findFilesForTest } = require("../dist/index.js")

const cwd = process.cwd()

findFilesForTest(cwd).then(files => {
	console.log(`${files.length} test files in ${cwd}`)
	if (files.length > 0) {
		console.log(files.join("\n"))
	}
	process.exit(0)
})
