// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

import nodepath from "path"
import {
	composeSequenceWithAllocatedMs,
	mutateAction,
	passed,
	chainFunctions,
	failed
} from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "./findFiles.js"

export const composeFileTests = ({ files, getFileTest }) => (
	{
		allocatedMs = Infinity,
		beforeEachFile = () => {},
		beforeEachTest = () => {},
		afterEachTest = () => {},
		afterEachFile = () => {}
	} = {}
) =>
	// we are running tests in sequence and not in parallel because they are likely going to fail
	// when they fail we want the failure to be reproductible, if they run in parallel we introduce
	// race condition, non determinism, etc: bad idea
	composeSequenceWithAllocatedMs(files, {
		handle: (action, file) => {
			beforeEachFile(file)
			return mutateAction(action, () =>
				passed(getFileTest(file))
					.then(test =>
						test({
							beforeEach: (...args) => beforeEachTest(file, ...args),
							afterEach: (...args) => afterEachTest(file, ...args),
							allocatedMs: action.getRemainingMs()
						})
					)
					.then(
						result => afterEachFile(file, result, true),
						result => afterEachFile(file, result, false)
					)
			)
		},
		allocatedMs
	})

const requireAllSourceFiles = location =>
	findSourceFiles(location).then(sourceFiles =>
		sourceFiles.forEach(sourceFile => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		})
	)

const getExportedTest = location => {
	const fileExports = require(location) // eslint-disable-line import/no-dynamic-require
	if ("default" in fileExports === false) {
		return failed("missing default export")
	}
	const defaultExport = fileExports.default
	if (typeof defaultExport !== "function") {
		return failed("file export default must be a function")
	}
	return passed(defaultExport)
}

export const createPackageTest = ({ location = process.cwd() }) => params =>
	chainFunctions(
		// we require source files so that code coverage know their existence and can report
		// their coverage (in case no test cover them they still appear in the report)@
		() => requireAllSourceFiles(location),
		() => findFilesForTest(location),
		files =>
			composeFileTests(
				Object.assign(
					{
						files,
						getFileTest: file => getExportedTest(nodepath.resolve(location, file))
					},
					params
				)
			)(params)
	)
