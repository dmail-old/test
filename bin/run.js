#!/usr/bin/env node

const { test } = require("../index.js")

const cwd = process.cwd()
const log = (...args) => console.log(...args)
const warn = (...args) => console.warn(...args)

test({
	location: cwd,
	before: ({ file }) => {
		log(`test ${file}`)
	},
	after: ({ file }, { failed, message = "unspecified" }) => {
		if (failed) {
			warn(`failed because: ${message}`)
		} else {
			log(`passed because: ${message}`)
		}
	},
	failed: report => {
		const failedReports = report.filter(report => report.result.failed)
		warn(`${failedReports.length} tests failed`)
		process.exit(1)
	},
	passed: report => {
		if (report.length === 0) {
			log("perfecto! (no test to run xD)")
		} else {
			log(`perfecto! (${report.length} tests passed)`)
		}
		process.exit(0)
	}
})
