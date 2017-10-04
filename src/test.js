// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

const fs = require("fs")
const nodepath = require("path")
const { glob } = require("glob-gitignore")
const ignore = require("ignore")
const {
	fromFunction,
	fromNodeCallbackRecoveringWhen,
	sequence,
	passed,
	aroundAction
} = require("./action.js")

const getOptionalFileContent = fromNodeCallbackRecoveringWhen(
	fs.readFile,
	error => error.code === "ENOENT",
	""
)
const getOptionalFileContentAsString = path => getOptionalFileContent(path).then(String)

const sourceFileInclude = ["dist/**"]
const testFileInclude = ["dist/**/*.test.*"]

const sourceFileExclude = ["dist/**/*.map", testFileInclude]
const testFileExclude = ["dist/**/*.map"]

const findSourceFiles = (location = process.cwd()) => {
	const absoluteLocation = nodepath.resolve(process.cwd(), location)
	return glob(sourceFileInclude, {
		nodir: true,
		cwd: absoluteLocation,
		ignore: ignore().add(sourceFileExclude)
	})
}
exports.listSource = findSourceFiles

const findFilesForTest = (location = process.cwd()) => {
	const absoluteLocation = nodepath.resolve(process.cwd(), location)
	return getOptionalFileContentAsString(
		nodepath.join(absoluteLocation, ".testignore")
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

const createTest = (fn, { beforeEach = () => {}, afterEach = () => {} } = {}) => {
	const report = {}

	const createTestFromFunction = fn =>
		fromFunction(({ pass, fail }) => {
			// chaque test a par défaut 100ms pour pass/fail et peut utiliser
			// allocateMs pour diminuer/augmenter/supprimer ce timeout

			let timeoutid
			const cancelTimeout = () => {
				if (timeoutid !== undefined) {
					clearTimeout(timeoutid)
					timeoutid = undefined
				}
			}
			const passTest = value => {
				cancelTimeout()
				pass(value)
			}
			const failTest = value => {
				cancelTimeout()
				fail(value)
			}
			const allocateMs = ms => {
				cancelTimeout()
				timeoutid = setTimeout(() => fail(`must pass or fail in less than ${ms}ms`), 100)
			}
			allocateMs(100)

			fn({
				pass: passTest,
				fail: failTest,
				allocateMs
			})
		})

	const createEnsureHook = () => {
		const ensureFactories = []
		const ensure = (description, fn) => {
			const ensureFactory = () => {
				aroundAction(
					() => beforeEach(description),
					() => createTestFromFunction(fn),
					(result, passed) => {
						report[description] = {
							status: passed ? "passed" : "failed",
							result
						}
						afterEach(description, result)
					}
				)
			}
			ensureFactories.push(ensureFactory)
		}

		return fn => {
			fn(ensure)
			return sequence(ensureFactories, ensureFactory => ensureFactory())
		}
	}

	return createEnsureHook()(fn).then(() => report, () => report)
}

const test = ({
	location = process.cwd(),
	beforeEachFile = () => {},
	beforeEachTest = () => {},
	afterEachTest = () => {},
	afterEachFile = () => {}
}) => {
	const compositeResult = {}

	const createTestFromFile = file =>
		fromFunction(({ fail, pass }) => {
			const absoluteLocation = nodepath.resolve(location, file)
			const fileExports = require(absoluteLocation) // eslint-disable-line import/no-dynamic-require
			if ("default" in fileExports === false) {
				return fail("missing default export")
			}
			const defaultExport = fileExports.default
			if (typeof defaultExport !== "function") {
				return fail("file export default must be a function")
			}

			return pass(
				createTest(defaultExport, { beforeEach: beforeEachTest, afterEach: afterEachTest })
			)
		})

	return passed()
		.then(() => findSourceFiles(location))
		.then(sourceFiles =>
			sourceFiles.forEach(sourceFile => {
				const sourcePath = nodepath.resolve(location, sourceFile)
				require(sourcePath) // eslint-disable-line import/no-dynamic-require
			})
		)
		.then(() => findFilesForTest(location))
		.then(testFiles =>
			// we are running tests in sequence and not in parallel because they are likely going to fail
			// when they fail we want the failure to be reproductible, if they run in parallel we introduce
			// race condition, non determinism, etc: bad idea
			sequence(testFiles, testFile =>
				aroundAction(
					() => beforeEachFile(testFile),
					() => createTestFromFile(testFile),
					report => {
						afterEachFile(testFile, report)
						compositeResult[testFile] = report
					}
				)
			)
		)
		.then(() => compositeResult, () => compositeResult)
}
exports.test = test

// const testFoo = value =>
// 	createTest(
// 		ensure => {
// 			ensure("when you do that it does sething", ({ fail, pass }) => {
// 				if (value !== "foo") {
// 					return fail("value must be foo")
// 				}
// 				return pass("value is foo")
// 			})

// 			ensure("when you do something else it does amazing stuff", ({ fail, pass }) => {
// 				return pass("yeah")
// 			})
// 		},
// 		{
// 			beforeEach: path => {
// 				console.log("before", path.join(" "))
// 			},
// 			afterEach: (path, result) => {
// 				console.log("after", path.join(" "), result)
// 			}
// 		}
// 	)
// testFoo("foo").then()
