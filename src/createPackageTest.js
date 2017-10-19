// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

import nodepath from "path"
import { composeSequenceWithAllocatedMs, mutateAction, chainFunctions, failed } from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "./findFiles.js"

export const createPackageTest = ({
	location = process.cwd(),
	allocatedMs = 100,
	beforeEachFile = () => {},
	beforeEachTest = () => {},
	afterEachTest = () => {},
	afterEachFile = () => {}
}) =>
	chainFunctions([
		// we require source files so that code coverage know their existence and can report
		// their coverage (in case no test cover them they still appear in the report)@
		() => findSourceFiles(location),
		sourceFiles =>
			sourceFiles.forEach(sourceFile => {
				const sourcePath = nodepath.resolve(location, sourceFile)
				require(sourcePath) // eslint-disable-line import/no-dynamic-require
			}),
		() => findFilesForTest(location),
		testFiles =>
			// we are running tests in sequence and not in parallel because they are likely going to fail
			// when they fail we want the failure to be reproductible, if they run in parallel we introduce
			// race condition, non determinism, etc: bad idea
			composeSequenceWithAllocatedMs(
				testFiles,
				(action, testFile) => {
					beforeEachFile(testFile)
					return mutateAction(action, () => {
						const absoluteLocation = nodepath.resolve(location, testFile)
						const fileExports = require(absoluteLocation) // eslint-disable-line import/no-dynamic-require
						if ("default" in fileExports === false) {
							return failed("missing default export")
						}
						const defaultExport = fileExports.default
						if (typeof defaultExport !== "function") {
							return failed("file export default must be a function")
						}
						return defaultExport({
							beforeEach: (...args) => beforeEachTest(testFile, ...args),
							afterEach: (...args) => afterEachTest(testFile, ...args)
						})
					}).then(
						result => afterEachFile(testFile, result, true),
						result => afterEachFile(testFile, result, false)
					)
				},
				allocatedMs
			)
	])
