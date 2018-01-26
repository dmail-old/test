import { pure, mixin } from "@dmail/mixin"
import path from "path"
import { remap } from "./remapCallSite.js"

const tests = []

const replaceTest = (test, nextTest) => {
	const index = tests.indexOf(test)
	if (index > -1) {
		tests[index] = nextTest
	}
}

const createTest = ({ fn, fileName, lineNumber, columnNumber }) => {
	return mixin(pure, (test) => {
		const isFocused = () => false

		const focus = () => {
			const focusedTest = mixin(test, () => ({ isFocused: () => true }))
			replaceTest(test, focusedTest)
			return focusedTest
		}

		const isSkipped = () => false

		const skip = () => {
			const skippedTest = mixin(test, () => ({ isSkipped: () => true }))
			replaceTest(test, skippedTest)
			return skippedTest
		}

		const dirname = path.relative(process.cwd(), fileName)
		// https://github.com/Microsoft/vscode/issues/27713
		// we also have to sourcemap the fileName, lineNumber & columnNumber
		const description = `${dirname}:${lineNumber}:${columnNumber}`

		return {
			description,
			fn,
			focus,
			isFocused,
			skip,
			isSkipped,
		}
	})
}

// https://github.com/v8/v8/wiki/Stack-Trace-API
const getExternalCallerCallSite = () => {
	const { prepareStackTrace } = Error
	let callSites
	let callSite

	try {
		const error = new Error()

		Error.prepareStackTrace = (error, stack) => stack

		callSites = error.stack
		const currentFileName = callSites[0].getFileName()

		callSite = callSites.slice(1).find((callStack) => {
			return callStack.getFileName() !== currentFileName
		})
	} catch (e) {}

	Error.prepareStackTrace = prepareStackTrace

	return remap(callSite, callSites)
}

const test = (fn) => {
	// https://github.com/stefanpenner/get-caller-file
	const callSite = getExternalCallerCallSite()
	const fileName = callSite.getFileName()
	const lineNumber = callSite.getLineNumber()
	const columnNumber = callSite.getColumnNumber()

	const test = createTest({
		fn,
		fileName,
		lineNumber,
		columnNumber,
	})

	tests.push(test)

	return test
}
test.focus = (fn) => test(fn).focus()
test.skip = (fn) => test(fn).skip()
export { test }

export const collect = () => {
	const collectedTests = tests.slice()
	tests.length = 0

	const someTestIsFocused = collectedTests.some(({ isFocused }) => isFocused())

	if (someTestIsFocused) {
		return collectedTests.map((test) => {
			if (test.isFocused()) {
				return test
			}
			return test.skip()
		})
	}

	return collectedTests
}
