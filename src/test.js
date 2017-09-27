// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html

const fs = require("fs")
const path = require("path")
const { glob } = require("glob-gitignore")
const ignore = require("ignore")
const { promiseSequence, promisifyNodeCallback } = require("./promise-helper.js")

const getFileContent = promisifyNodeCallback(fs.readFile)
const getFileContentAsString = path => getFileContent(path).then(String)
const getOptionalFileContentAsString = path =>
	getFileContentAsString(path).catch(e => (e && e.code === "ENOENT" ? "" : Promise.reject(e)))

const findFilesForTest = (location = process.cwd()) => {
	const absoluteLocation = path.resolve(process.cwd(), location)
	return getOptionalFileContentAsString(
		path.join(absoluteLocation, ".execignore")
	).then(ignoreRules =>
		glob("dist/*.test.*", {
			cwd: absoluteLocation,
			ignore: ignore().add(ignoreRules)
		})
	)
}

const fromFile = file => {
	const defaultExport = require(file) // eslint-disable-line import/no-dynamic-require
	const run = () => {
		let timeoutid
		const cancelTimeout = () => {
			if (timeoutid !== undefined) {
				clearTimeout(timeoutid)
				timeoutid = undefined
			}
		}
		let resolveResult
		const resultPromise = new Promise(resolve => {
			resolveResult = resolve
		})
		const pass = message => {
			cancelTimeout()
			resolveResult({
				failed: false,
				message
			})
		}
		const fail = message => {
			cancelTimeout()
			resolveResult({
				failed: true,
				message
			})
		}

		const allocateMs = ms => {
			cancelTimeout()
			timeoutid = setTimeout(() => fail(`must pass or fail in less than ${ms}ms`), 100)
		}
		allocateMs(100)

		defaultExport({
			pass,
			fail,
			allocateMs
		})

		// for now we're using a promise for convenience
		// but the try/catch behaviour of promise annoys me and I would like to let my process crash
		// when unexpected error happens
		// the test can try/catch fn execution to catch AssertionError is they want but at least
		// the runnet tries not to do that
		return resultPromise
	}

	return {
		file,
		run
	}
}
const fromFiles = files => files.map(fromFile)

// we are running tests in sequence and not in parallel because they are likely going to fail
// when they fail we want the failure to be reproductible, if they run in parallel we introduce
// race condition, non determinism, etc: bad idea
const test = ({ location = process.cwd(), before = () => {}, after = () => {} }) => {
	let report = []

	return findFilesForTest(location)
		.then(fromFiles)
		.then(tests => {
			return promiseSequence(tests, test => {
				before(test)
				return test.run().then(result => {
					report.push({
						test,
						result
					})
					after(test, result)
					if (result.failed) {
						return Promise.reject(report)
					}
					return report
				})
			})
		})
		.catch(exception => {
			return exception === report ? report : Promise.reject(exception)
		})
}
exports.test = test
