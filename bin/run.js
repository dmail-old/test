#!/usr/bin/env node

import { createPackageTest } from "../index.js"
import { passedIcon, failedIcon, passedColor, failedColor, endColor } from "../src/styles.js"

const cwd = process.cwd()
const log = (...args) => process.stdout.write(...args)
const warn = (...args) => process.stdout.write(...args)
const test = createPackageTest({
	location: cwd
})

const createBeforeEachFileMessage = file => `test ${file}
`
const createBeforeEachTestMessage = description => `	${description}: `

const createFailedTestMessage = () => `${failedColor}${failedIcon} failed${endColor}
`

const createPassedTestMessage = () => `${passedColor}${passedIcon} passed${endColor}
`

const createFailedFileMessage = report => {
	const tests = Object.keys(report).map(key => report[key])
	const failedCount = tests.filter(test => {
		return test.state === "failed"
	}).length
	return `${failedColor}${failedIcon} ${failedCount} failed tests on ${tests.length}${endColor}
`
}

const createPassedFileMessage = report => {
	const testCount = Object.keys(report).length
	return `${passedColor}${passedIcon} ${testCount} tests passed${endColor}

`
}
const createPassedMessage = report => {
	const fileCount = Object.keys(report).length
	return `${passedColor}${passedIcon} ${fileCount} files tested${endColor}
`
}

const beforeEachFile = file => log(createBeforeEachFileMessage(file))
const beforeEachTest = (file, description) => log(createBeforeEachTestMessage(description))
const afterEachTest = (file, description, report, passed) => {
	if (passed) {
		log(createPassedTestMessage())
	} else {
		warn(createFailedTestMessage())
	}
}
const afterEachFile = (file, report, passed) => {
	if (passed) {
		log(createPassedFileMessage(report))
	} else {
		warn(createFailedFileMessage(report))
	}
}
const afterAll = (report, passed) => {
	if (passed) {
		log(createPassedMessage(report))
		process.exit(0)
	} else {
		process.exit(1)
	}
}

test({
	beforeEachFile,
	beforeEachTest,
	afterEachTest,
	afterEachFile
}).then(report => afterAll(report, true), report => afterAll(report, false))
