import { createActionWithAllocableMs, compose, createIterator } from "@dmail/action"

export const createGroup = (...tests) => {
	return ({ allocatedMs = Infinity, beforeEach, afterEach }) => {
		const someTestIsForced = tests.some(({ isForced }) => isForced())
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
				if (someTestIsForced && test.isForced() === false) {
					test.skip()
				}

				const nextAction = createActionWithAllocableMs()
				currentExpirationToken = nextAction.allocateMs(action.getRemainingMs())
				nextAction.pass(test.run({ before: beforeEach, after: afterEach }))

				return nextAction
			},
		})
	}
}
