import { mixin } from "@dmail/mixin"
import {
	createAction,
	allocableMsTalent,
	createActionWithAllocableMs,
	compose,
	createIterator,
} from "@dmail/action"

export const executeOne = (
	{ description, implementation, focused = false, skipped = false },
	{ onReady = () => {}, onEnd = () => {}, allocatedMs = Infinity, ...props } = {},
) => {
	const startMs = Date.now()
	onReady({ description, focused, skipped, startMs })

	const action = mixin(createAction(), allocableMsTalent)
	const expirationToken = action.allocateMs(allocatedMs)

	if (skipped) {
		action.pass()
	} else {
		action.pass(
			implementation({
				startMs,
				allocatedMs,
				...props,
			}),
		)
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

export const executeMany = (tests, { allocatedMs = Infinity, ...props } = {}) => {
	const values = []
	let someHasFailed = false

	const from = createActionWithAllocableMs(allocatedMs)
	let currentExpirationToken = from.allocateMs(allocatedMs)
	from.pass()

	return compose({
		from,
		iterator: createIterator(tests),
		composer: ({ action, value, state, index, nextValue, done, fail, pass }) => {
			if (index > -1) {
				// I should also measure duration before action pass/fail
				values.push(value)
			}
			if (state === "failed") {
				if (value === currentExpirationToken) {
					// fail saying we are out of 10ms
					// even if the action may say it failed because it had only 8ms
					// because the composedAction has 10ms
					// even if its subaction may have less
					return fail(currentExpirationToken.toString())
				}
				someHasFailed = true
			}
			if (done) {
				if (someHasFailed) {
					return fail(values)
				}
				return pass(values)
			}

			const test = nextValue
			const nextAction = createActionWithAllocableMs()
			currentExpirationToken = nextAction.allocateMs(action.getRemainingMs())
			nextAction.pass(executeOne(test, props))

			return nextAction
		},
	})
}
