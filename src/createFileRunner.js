// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

import nodepath from "path"
import {
	collectSequenceWithAllocatedMs,
	mapIterable,
	passed,
	chainFunctions,
	failed,
} from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "./findFiles.js"
import { createTest } from "./createTestRunner.js"

export const composeFileTests = ({ files, getFileTest }) => (
	{
		allocatedMs = Infinity,
		beforeEachFile = () => {},
		beforeEachTest = () => {},
		afterEachTest = () => {},
		afterEachFile = () => {},
	} = {},
) =>
	// we are running tests in sequence and not in parallel because they are likely going to fail
	// when they fail we want the failure to be reproductible, if they run in parallel we introduce
	// race condition, non determinism, etc: bad idea
	collectSequenceWithAllocatedMs(
		mapIterable(files, (file) => {
			beforeEachFile({ file })
			return passed(getFileTest(file))
				.then((test) =>
					test({
						beforeEach: (data) => beforeEachTest({ file, ...data }),
						afterEach: (data) => afterEachTest({ file, ...data }),
					}),
				)
				.then(
					(result) => afterEachFile({ file, result, passed: true }),
					(result) => afterEachFile({ file, result, passed: false }),
				)
		}),
		{
			allocatedMs,
		},
	)

const requireAllSourceFiles = (location) =>
	findSourceFiles(location).then((sourceFiles) =>
		sourceFiles.forEach((sourceFile) => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		}),
	)

const runExportName = "run"

const getExportedFunctionToRun = (location) => {
	const fileExports = require(location) // eslint-disable-line import/no-dynamic-require
	if (runExportName in fileExports === false) {
		// it's allowed to omit the export
		return passed(createTest({}))
	}
	const testExport = fileExports[runExportName]
	if (typeof testExport !== "function") {
		return failed(`file ${runExportName} export must be a function`)
	}
	return passed(testExport)
}

export const createFileRunner = ({ location = process.cwd() }) => (params) =>
	chainFunctions(
		// we require source files so that code coverage know their existence and can report
		// their coverage (in case no test cover them they still appear in the report)@
		() => requireAllSourceFiles(location),
		() => findFilesForTest(location),
		(files) =>
			composeFileTests({
				files,
				getFileTest: (file) => getExportedFunctionToRun(nodepath.resolve(location, file)),
			})(params),
	)
