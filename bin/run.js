#!/usr/bin/env node

import nodepath from "path"
import { passed, chainFunctions, sequence } from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "../src/findFiles.js"
import { passedIcon, failedIcon, passedColor, failedColor, endColor } from "../src/styles.js"
import { createTemplate, compileMany } from "../src/createTemplate.js"

const log = (...args) => process.stdout.write(...args)
const warn = (...args) => process.stdout.write(...args)

const createBeforeEachFileMessage = ({ file }) => `test ${file}
`
const createBeforeEachTestMessage = ({ description }) => `	${description}: `

const createFailedTestMessage = () => `${failedColor}${failedIcon} failed${endColor}
`

const createPassedTestMessage = () => `${passedColor}${passedIcon} passed${endColor}
`

const createFailedFileMessage = ({ value: tests }) => {
	const failedCount = tests.filter((test) => test.state === "failed").length
	return `${failedColor}${failedIcon} ${failedCount} failed tests on ${tests.length}${endColor}
`
}

const createPassedFileMessage = ({ value: tests }) => {
	const testCount = tests.length
	return `${passedColor}${passedIcon} ${testCount} tests passed${endColor}

`
}

const createPassedMessage = ({ value }) => {
	const fileCount = value.length
	return `${passedColor}${passedIcon} ${fileCount} files tested${endColor}
`
}

const createFailedMessage = (report) => {
	if (typeof report === "string") {
		return `CRITICAL FAILURE: ${report}`
	}

	const fileCount = Object.keys(report).length
	const failedFileCount = Object.keys(report)
		.map((file) => report[file])
		.filter((fileReport) => {
			return Object.keys(fileReport)
				.map((key) => report[key])
				.some((testReport) => {
					return testReport.state === "failed"
				})
		}).length
	return `${failedColor}${failedIcon} ${failedFileCount} failed files on ${fileCount}${endColor}
`
}

const beforeEachFile = ({ file }) => log(createBeforeEachFileMessage(file))

const beforeEachTest = ({ description }) => log(createBeforeEachTestMessage(description))

const afterEachTest = ({ state }) => {
	if (state === "passed") {
		log(createPassedTestMessage())
	} else {
		warn(createFailedTestMessage())
	}
}

const afterEachFile = ({ value, state }) => {
	if (state === "passed") {
		log(createPassedFileMessage(value))
	} else {
		warn(createFailedFileMessage(value))
	}
}

const after = (report, passed) => {
	if (passed) {
		log(createPassedMessage(report))
		process.exit(0)
	} else {
		log(createFailedMessage(report))
		process.exit(1)
	}
}

const requireAllSourceFiles = (location) => {
	return findSourceFiles(location).then((sourceFiles) =>
		sourceFiles.forEach((sourceFile) => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		}),
	)
}

const exportName = "unit"
const getExportedTest = (location) => {
	const fileExports = require(location) // eslint-disable-line import/no-dynamic-require
	if (exportName in fileExports === false) {
		// it's allowed to omit the export
		return passed(null)
	}
	const exportedValue = fileExports[exportName]
	// if (typeof export !== "function") {
	// 	return failed(`file ${exportName} export must be a suite`)
	// }
	return passed(exportedValue)
}

const cwd = process.cwd()
const tpl = createTemplate({
	description: "stuff",
	parse: () => {
		return chainFunctions(
			// we require source files so that code coverage know their existence and can report
			// their coverage (in case no test cover them they still appear in the report)@
			() => requireAllSourceFiles(cwd),
			() => findFilesForTest(cwd),
			(files) => {
				const fileScenarios = files
					.map((file) => getExportedTest(nodepath.resolve(cwd, file)))
					// filter file without export
					.filter((test) => test !== null)

				return sequence(fileScenarios, (fileScenario) => {
					return fileScenario.parse()
				}).then((parsedFileScenarios) => {
					return {
						parsed: parsedFileScenarios,
						compile: (params) => {
							return compileMany(parsedFileScenarios, {
								beforeEach: beforeEachFile,
								afterEach: afterEachFile,
								compiler: (parsedFileScenario) => {
									return compileMany(parsedFileScenario, {
										beforeEach: beforeEachTest,
										afterEach: afterEachTest,
										...params,
									})
								},
								...params,
							})
						},
					}
				})
			},
		)
	},
})

tpl.execute({
	after,
	// searching tests files & requiring does not consume any allocatedMs
	// only test execution consume them
	// here we force all tests to be over in less than 1s
	allocatedMs: 1000,
})
