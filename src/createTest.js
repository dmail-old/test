import { createFactory, pure, mixin } from "@dmail/mixin"
import { passed, allocableMsTalent } from "@dmail/action"
import {
	forcedIcon,
	passedIcon,
	failedIcon,
	skippedIcon,
	passedColor,
	failedColor,
	skippedColor,
	endColor,
} from "./styles.js"

/* istanbul ignore next: internal usage, not meant to be used nor maintained */
const createAutoRun = (run) => {
	const appendResult = (string, value) => {
		if (value) {
			return `${string}: ${value}`
		}
		return string
	}

	const beforeEach = ({ description, forced }) => {
		console.log("")
		console.log(forced ? `${forcedIcon} ${description}` : description)
	}

	const afterEach = ({ skipped, passed, value }) => {
		if (skipped) {
			console.log(appendResult(`${skippedColor}${skippedIcon} skipped${endColor}`, value))
		} else if (passed) {
			console.log(appendResult(`${passedColor}${passedIcon} passed${endColor}`, value))
		} else {
			console.log(appendResult(`${failedColor}${failedIcon} failed${endColor}`, value))
		}
	}

	const after = ({ value }) => {
		const data = value

		if (typeof data === "string") {
			console.log(`CRITICAL FAILURE: ${data}`)
			return
		}

		const testCount = data.length
		const skippedCount = data.filter(({ skipped }) => skipped).length
		const passedCount = data.filter(({ state }) => state === "passed").length
		const failedCount = data.filter(({ state }) => state === "failed").length

		console.log("")
		if (failedCount === 0) {
			console.log(
				`${passedColor}${passedIcon} ${passedCount} tests passed${endColor} on ${testCount}`,
			)
			if (skippedCount > 0) {
				console.log(`${skippedColor}${skippedIcon} ${skippedCount} tests skipped${endColor}`)
			}
		} else {
			console.log(
				`${failedColor}${failedIcon} ${failedCount} failed tests on ${testCount}${endColor}`,
			)
			if (skippedCount > 0) {
				console.log(`${skippedColor}${skippedIcon} ${skippedCount} tests skipped${endColor}`)
			}
		}
	}

	return (filepath) => {
		const before = () => {
			console.log(`autorun test file ${filepath}`)
		}

		run({
			before,
			beforeEach,
			afterEach,
			after,
		})
	}
}

export const createTest = createFactory(pure, ({ description, scenario }) => {
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

	const run = ({ before = () => {}, after = () => {}, allocatedMs = Infinity, ...props }) => {
		const startMs = Date.now()
		before({ description, forced, skipped, startMs })

		const action = skipped
			? passed()
			: passed(
					scenario({
						startMs,
						allocatedMs,
						...props,
					}),
				)

		const timeLimitedAction = mixin(action, allocableMsTalent)
		const expirationToken = timeLimitedAction.allocateMs(allocatedMs)

		const end = (value, passed) => {
			const endMs = Date.now()
			const result = {
				description,
				forced,
				skipped,
				startMs,
				endMs,
				value,
				expired: value === expirationToken,
				passed,
			}
			after(result)
			return result
		}

		return timeLimitedAction.then((value) => end(value, true), (value) => end(value, false))
	}

	const autoRun = createAutoRun

	return { run, force, skip, isForced, isSkipped, ["@@autorun"]: autoRun }
})
