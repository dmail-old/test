// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

const fs = require("fs")
const path = require("path")
const { glob } = require("glob-gitignore")
const ignore = require("ignore")
const { promisifyNodeCallback } = require("./promise-helper.js")

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

const createTestFromFile = path => {
	const fileExports = require(path) // eslint-disable-line import/no-dynamic-require
	return ({ fail, pass, allocateMs }) => {
		if ("default" in fileExports === false) {
			return fail("missing default export")
		}
		const defaultExport = fileExports.default
		if (typeof defaultExport !== "function") {
			return fail("file export default must be a function")
		}
		defaultExport({
			pass,
			fail,
			allocateMs
		})
	}
}
const createTestExecution = ({ onResult }) => {
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

	return {
		pass,
		fail,
		allocateMs,
		onResult
	}
}

const callback = () => {}

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
		const fileTest = createTestFromFile(filePath)
		const run = () => {
			return callback(() => {
				const testExecution = createTestExecution({ onResult })
				fileTest(testExecution)
			})
		}

		return {
			file,
			run
		}
	}
	const fromFiles = files => files.map(fromFile)

	return callback()
		.chain(() => findSourceFiles(location))
		.chain(sourceFiles => {
			sourceFiles.forEach(sourceFile => {
				const sourcePath = path.resolve(location, sourceFile)
				require(sourcePath) // eslint-disable-line import/no-dynamic-require
			})
		})
		.chain(() => findFilesForTest(location))
		.chain(fromFiles)
		.sequence(test => {
			before(test)
			return test.run().always(result => {
				after(test, result)
				return result
			})
		})
		.chain(() => passed(report))
		.chainFailed(() => failed(report))
}
exports.test = test
