import fs from "fs"
import nodepath from "path"
import { glob } from "glob-gitignore"
import ignore from "ignore"

import { fromPromise, fromNodeCallbackCatching } from "@dmail/action"

const sourceFileInclude = ["dist/**"]
const testFileInclude = ["dist/**/*.test.*"]

const sourceFileExclude = ["dist/**/*.map", testFileInclude]
const testFileExclude = ["dist/**/*.map"]

export const findSourceFiles = (location = process.cwd()) => {
	const absoluteLocation = nodepath.resolve(process.cwd(), location)
	return fromPromise(
		glob(sourceFileInclude, {
			nodir: true,
			cwd: absoluteLocation,
			ignore: sourceFileExclude
		})
	)
}

const getOptionalFileContent = fromNodeCallbackCatching(
	fs.readFile,
	error => error.code === "ENOENT",
	""
)
const getOptionalFileContentAsString = path => getOptionalFileContent(path).then(String)

export const findFilesForTest = (location = process.cwd()) => {
	const absoluteLocation = nodepath.resolve(process.cwd(), location)
	return getOptionalFileContentAsString(nodepath.join(absoluteLocation, ".testignore"))
		.then(ignoreRules =>
			ignore()
				.add(testFileExclude)
				.add(ignoreRules)
		)
		.then(ignore =>
			fromPromise(
				glob(testFileInclude, {
					nodir: true,
					cwd: absoluteLocation,
					ignore: ignore._rules.map(({ origin }) => origin)
				})
			)
		)
}
