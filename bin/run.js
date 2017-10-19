#!/usr/bin/env node

const { createPackageTest } = require("../index.js")

const cwd = process.cwd()
const log = (...args) => process.stdout.write(...args)
const warn = (...args) => process.stdout.write(...args)

createPackageTest({
	location: cwd,
	beforeEachFile: file => {
		log(`test ${file}
`)
	},
	beforeEachTest: description => {
		log(`	ensure ${description}: `)
	},
	afterEachTest: (description, report) => {
		if (report.state === "failed") {
			warn(`failed`)
		} else {
			log(`passed`)
		}
	},
	afterEachFile: (file, report) => {
		if (report.state === "failed") {
			warn(`
failed
`)
		} else {
			const testCount = Object.keys(report.result).length
			log(`
passed (${testCount} tests)
`)
		}
	}
}).then(
	report => {
		const fileCount = Object.keys(report).length
		if (fileCount === 0) {
			log(`
perfecto! (no files ^^')
`)
		} else {
			log(`
perfecto! (${fileCount} files)
`)
		}
		process.exit(0)
	},
	() => {
		process.exit(1)
	}
)
