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
	const run = ({ onResult }) => {
		let timeoutid
		const cancelTimeout = () => {
			if (timeoutid !== undefined) {
				clearTimeout(timeoutid)
				timeoutid = undefined
			}
		}
		const pass = message => {
			cancelTimeout()
			onResult({
				failed: false,
				message
			})
		}
		const fail = message => {
			cancelTimeout()
			onResult({
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

// we are using promise for convenience but ideally we'll remove that to avoid promise try/catching
// which is so annoying
const test = ({
	location = process.cwd(),
	before = () => {},
	after = () => {},
	failed = () => {},
	passed = () => {}
}) => {
	let report = []

	return findFilesForTest(location)
		.then(fromFiles)
		.then(tests => {
			return promiseSequence(tests, test => {
				before(test)
				return new Promise((resolve, reject) => {
					test.run({
						onResult: result => {
							report.push({
								test,
								result
							})
							after(test, result)
							if (result.failed) {
								reject(report)
							} else {
								resolve()
							}
						}
					})
				})
			})
		})
		.then(
			() => passed(report),
			exception => {
				if (exception === report) {
					failed(report)
					return
				}
				setTimeout(() => {
					throw exception
				})
			}
		)
}
exports.test = test
