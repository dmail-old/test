import { mixin } from "@dmail/mixin"
import { createAction, allocableMsTalent, compose, createIterator, passed } from "@dmail/action"

export const executeOne = (
	{ fn, isFocused, isSkipped, fileName, lineNumber, columnNumber },
	{ onReady = () => {}, onEnd = () => {}, allocatedMs = Infinity } = {},
) => {
	const description = `${fileName}:${lineNumber}:${columnNumber}`

	const implementation = () => passed(fn())

	const focused = isFocused()

	const skipped = isSkipped()

	const startMs = Date.now()
	onReady({ description, focused, skipped, startMs })

	const action = mixin(createAction(), allocableMsTalent)
	const expirationToken = action.allocateMs(allocatedMs)

	if (skipped) {
		action.pass()
	} else {
		action.pass(implementation())
	}

	const end = (value, passed) => {
		const endMs = Date.now()
		const result = {
			description,
			focused,
			skipped,
			startMs,
			endMs,
			expired: value === expirationToken,
			passed,
			value,
		}
		onEnd(result)
		return result
	}

	return action.then((value) => end(value, true), (value) => end(value, false))
}

export const executeMany = (tests, props) => {
	const someTestIsFocused = tests.some(({ isFocused }) => isFocused())

	if (someTestIsFocused) {
		tests.forEach(({ isFocused, skip }) => {
			if (isFocused() === false) {
				skip()
			}
		})
	}

	const values = []
	let someHasFailed = false

	return compose({
		iterator: createIterator(tests),
		composer: ({ value, state, index, nextValue, done, fail, pass }) => {
			if (index > -1) {
				values.push(value)
			}
			if (state === "failed") {
				someHasFailed = true
			}
			if (done) {
				if (someHasFailed) {
					return fail(values)
				}
				return pass(values)
			}

			return executeOne(nextValue, props)
		},
	})
}
