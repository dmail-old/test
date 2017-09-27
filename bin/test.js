const { test } = require("../index.js")

const cwd = process.cwd()
const log = (...args) => console.log(...args)
const warn = (...args) => console.warn(...args)

test({
	location: cwd,
	before: ({ file }) => {
		log(`executing ${file}`)
	},
	after: ({ file }, { failed }) => {
		if (failed) {
			warn(`failed`)
		} else {
			log("passed")
		}
	},
	failed: report => {
		const failedReports = report.filter(report => report.result.failed)

		if (failedReports.length === 1) {
			warn(`${failedReports[0].test.file} failed`)
		} else {
			warn(`${failedReports.length} tests failed`)
		}
		process.exit(1)
	},
	passed: () => {
		log(`perfecto!`)
		process.exit(0)
	}
})
