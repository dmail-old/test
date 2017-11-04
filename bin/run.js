#!/usr/bin/env node

import { createPackageTest } from "../index.js"

const cwd = process.cwd()
const log = (...args) => process.stdout.write(...args)
const warn = (...args) => process.stdout.write(...args)
const test = createPackageTest({
	location: cwd
})

const createBeforeEachFileMessage = file => `test ${file}
`
const createBeforeEachTestMessage = description => `	${description}: `
const createFailedTestMessage = () => `failed
`
const createPassedTestMessage = () => `passed
`
const createFailedFileMessage = () => `failed

`
const createPassedFileMessage = report => {
	const testCount = Object.keys(report).length
	return `passed (${testCount} tests)

`
}
const createPassedMessage = report => {
	const fileCount = Object.keys(report).length
	if (fileCount === 0) {
		return `perfecto! (no files ^^')
`
	}
	return `perfecto! (${fileCount} files)
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
