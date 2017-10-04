#!/usr/bin/env node

const { test } = require("../index.js")

const cwd = process.cwd()
const log = (...args) => process.stdout.write(...args)
const warn = (...args) => process.stdout.write(...args)

test({
	location: cwd,
	beforeEachFile: file => {
		log(`test ${file}
		`)
	},
	beforeEachTest: description => {
		log(`	ensure ${description}:`)
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
			log(`
passed
			`)
		}
	}
}).then(
	report => {
		if (report.length === 0) {
			log(`perfecto! (no test to run xD)
			`)
		} else {
			log(`perfecto! (${report.length} tests passed)
			`)
		}
		process.exit(0)
	},
	() => {
		process.exit(1)
	}
)
