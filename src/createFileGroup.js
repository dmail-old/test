// https://github.com/kaelzhang/node-ignore
// https://github.com/kaelzhang/node-glob-gitignore
// https://karma-runner.github.io/latest/config/plugins.html
// https://karma-runner.github.io/latest/dev/plugins.html
// https://www.npmjs.com/package/glob#options

import nodepath from "path"
import { passed, chainFunctions } from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "./findFiles.js"
import { createGroup } from "./createGroup.js"

const requireAllSourceFiles = (location) =>
	findSourceFiles(location).then((sourceFiles) =>
		sourceFiles.forEach((sourceFile) => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		}),
	)

const exportName = "unit"
const getExportedTest = (location) => {
	const fileExports = require(location) // eslint-disable-line import/no-dynamic-require
	if (exportName in fileExports === false) {
		// it's allowed to omit the export
		return passed(null)
	}
	const exportedValue = fileExports[exportName]
	// if (typeof export !== "function") {
	// 	return failed(`file ${exportName} export must be a suite`)
	// }
	return passed(exportedValue)
}

export const createFileGroup = ({ location = process.cwd() }) => {
	return (params) =>
		chainFunctions(
			// we require source files so that code coverage know their existence and can report
			// their coverage (in case no test cover them they still appear in the report)@
			() => requireAllSourceFiles(location),
			() => findFilesForTest(location),
			(files) => {
				const fileTests = files
					.map((file) => getExportedTest(nodepath.resolve(location, file)))
					// filter file without export
					.filter((test) => test !== null)
				return createGroup(...fileTests)(params)
			},
		)
}
