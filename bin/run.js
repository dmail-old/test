#!/usr/bin/env node

import nodepath from "path"
import { passed, chainFunctions } from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "../src/findFiles.js"
import { autoExecute } from "../src/autoExecute.js"
import { collect } from "../src/plan.js"

const requireAllSourceFiles = (location) => {
	return findSourceFiles(location).then((sourceFiles) =>
		sourceFiles.forEach((sourceFile) => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		}),
	)
}

const exportName = "testPlan"
const getExportedPlan = (location) => {
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

const cwd = process.cwd()

chainFunctions(
	// we require source files so that code coverage know their existence and can report
	// their coverage (in case no test cover them they still appear in the report)
	// this is a hack, a better solution would just mark them as "must be covered"
	// instead of requiring them manually
	() => requireAllSourceFiles(cwd),
	() => findFilesForTest(cwd),
	(files) => {
		const filePlans = files
			.map((file) => getExportedPlan(nodepath.resolve(cwd, file)))
			// filter file without export
			.filter((plan) => plan !== null)

		return autoExecute(collect(...filePlans), { allocatedMs: 1000 })
	},
).then(() => process.exit(0), () => process.exit(1))
