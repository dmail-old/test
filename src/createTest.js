import { pure, mixin } from "@dmail/mixin"

const tests = []

const focusable = () => {
	let focused = false

	const focus = () => {
		focused = true
	}

	const isFocused = () => focused

	return { isFocused, focus }
}

const skippable = () => {
	let skipped = false

	const skip = () => {
		skipped = true
	}

	const isSkipped = () => skipped

	return { isSkipped, skip }
}

const createTest = ({ fn, description, fileName, lineNumber, columnNumber }) => {
	return mixin(pure, focusable, skippable, () => {
		return { fn, description, fileName, lineNumber, columnNumber }
	})
}

// https://github.com/v8/v8/wiki/Stack-Trace-API
const getExternalCallerStack = () => {
	const { prepareStackTrace } = Error
	let callerStack

	try {
		const error = new Error()

		Error.prepareStackTrace = (error, stack) => stack

		const stack = error.stack
		const currentFileName = stack[0].getFileName()

		callerStack = stack.slice(1).find((callStack) => {
			return callStack.getFileName() !== currentFileName
		})
	} catch (e) {}

	Error.prepareStackTrace = prepareStackTrace

	return callerStack
}

const test = (fn) => {
	// https://github.com/stefanpenner/get-caller-file
	const caller = getExternalCallerStack()
	const fileName = caller.getFileName()
	const lineNumber = caller.getLineNumber()
	const columnNumber = caller.getColumnNumber()
	const test = createTest({
		fn,
		fileName,
		lineNumber,
		columnNumber,
	})
	tests.push(test)

	return test
}

test.focus = (fn) => {
	const theTest = test(fn)
	theTest.focus()
	return theTest
}
test.skip = (fn) => {
	const theTest = test(fn)
	theTest.skip()
	return theTest
}

export { test }

export const collect = () => tests
