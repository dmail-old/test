import { createFactory, pure, mixin } from "@dmail/mixin"
import { createAction, allocableMsTalent } from "@dmail/action"

export const createTemplate = createFactory(pure, ({ description, implementation }) => {
	let forced = false

	const isForced = () => forced

	const force = () => {
		forced = true
	}

	let skipped = false

	const isSkipped = () => skipped

	const skip = () => {
		skipped = true
	}

	const run = ({ before = () => {}, after = () => {}, allocatedMs = Infinity, ...props } = {}) => {
		const startMs = Date.now()
		before({ description, forced, skipped, startMs })

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
				forced,
				skipped,
				startMs,
				endMs,
				expired: value === expirationToken,
				passed,
				value,
			}
			after(result)
			return result
		}

		return action.then((value) => end(value, true), (value) => end(value, false))
	}

	return { run, force, skip, isForced, isSkipped }
})
