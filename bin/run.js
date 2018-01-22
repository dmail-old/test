#!/usr/bin/env node

import nodepath from "path"
import { passed, chainFunctions, sequence } from "@dmail/action"
import { findSourceFiles, findFilesForTest } from "../src/findFiles.js"
import { autoExecute } from "../src/autoExecute.js"
import { collect } from "../src/createTest.js"

const requireAllSourceFiles = (location) => {
	return findSourceFiles(location).then((sourceFiles) =>
		sourceFiles.forEach((sourceFile) => {
			const sourcePath = nodepath.resolve(location, sourceFile)
			require(sourcePath) // eslint-disable-line import/no-dynamic-require
		}),
	)
}

const getTests = (location) => {
	require(location) // eslint-disable-line import/no-dynamic-require
	return passed(collect())
}

const cwd = process.cwd()

chainFunctions(
	// we require source files so that code coverage know their existence and can report
	// their coverage (in case no test cover them they still appear in the report)
	// this is a hack, a better solution would just mark them as "must be covered"
	// instead of requiring them manually
	() => requireAllSourceFiles(cwd),
	() => findFilesForTest(cwd),
	(files) => sequence(files, (file) => getTests(nodepath.resolve(cwd, file))),
	(filesTests) => filesTests.reduce((accumulator, tests) => accumulator.concat(tests), []),
).then(
	(tests) =>
		autoExecute(tests, { allocatedMs: 100 }).then(() => process.exit(0), () => process.exit(1)),
	(failure) => {
		console.log(failure)
		process.exit(1)
	},
)
