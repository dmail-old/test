// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

const fs = require("fs")
const path = require("path")
const { glob } = require("glob-gitignore")
const ignore = require("ignore")
const { promiseSequence, promisifyNodeCallback } = require("./promise-helper.js")

const getFileContent = promisifyNodeCallback(fs.readFile)
const getFileContentAsString = path => getFileContent(path).then(String)
const getOptionalFileContentAsString = path =>
	getFileContentAsString(path).catch(e => (e && e.code === "ENOENT" ? "" : Promise.reject(e)))

const sourceFileInclude = ["dist/**"]
const testFileInclude = ["dist/**/*.test.*"]

const sourceFileExclude = ["dist/**/*.map", testFileInclude]
const testFileExclude = ["dist/**/*.map"]

const findSourceFiles = (location = process.cwd()) => {
	const absoluteLocation = path.resolve(process.cwd(), location)
	return glob(sourceFileInclude, {
		nodir: true,
		cwd: absoluteLocation,
		ignore: ignore().add(sourceFileExclude)
	})
}
exports.listSource = findSourceFiles

const findFilesForTest = (location = process.cwd()) => {
	const absoluteLocation = path.resolve(process.cwd(), location)
	return getOptionalFileContentAsString(
		path.join(absoluteLocation, ".testignore")
	).then(ignoreRules =>
		glob(testFileInclude, {
			nodir: true,
			cwd: absoluteLocation,
			ignore: ignore()
				.add(testFileExclude)
				.add(ignoreRules)
		})
	)
}
exports.list = findFilesForTest

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

	const fromFile = file => {
		const filePath = path.resolve(location, file)
		const fileExports = require(filePath) // eslint-disable-line import/no-dynamic-require
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

			if ("default" in fileExports) {
				const defaultExport = fileExports.default
				if (typeof defaultExport === "function") {
					defaultExport({
						pass,
						fail,
						allocateMs
					})
				} else {
					fail("file export default must be a function")
				}
			} else {
				fail("missing default export")
			}
		}

		return {
			file,
			run
		}
	}
	const fromFiles = files => files.map(fromFile)

	// we don't have to require sourceFiles, the all option in nycrc does this for us
	// .then(() => findSourceFiles(location)
	// .then(sourceFiles => {
	// 	// the first thing we do is to require all source files
	// 	// so that if tests are not executing their codes
	// 	// they will be reported as not covered ;)
	// 	sourceFiles.forEach(sourceFile => {
	// 		const sourcePath = path.resolve(location, sourceFile)
	// 		require(sourcePath)
	// 	})
	// })

	return Promise.resolve()
		.then(() => findFilesForTest(location))
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
					console.error("an exception occured", exception)
					throw exception
				})
			}
		)
}
exports.test = test
