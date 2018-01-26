import { executeMany } from "./execute.js"
import {
	forcedIcon,
	passedIcon,
	failedIcon,
	passedColor,
	failedColor,
	skippedColor,
	expiredIcon,
	expiredColor,
	endColor,
} from "./styles.js"

/* istanbul ignore next: internal usage, not meant to be used nor maintained */
export const autoExecute = (tests, { allocatedMs } = {}) => {
	const appendResult = (string, value) => {
		if (value) {
			return `${string} with ${value}`
		}
		return string
	}

	const onReady = ({ description, forced, skipped }) => {
		if (skipped) {
			return
		}
		console.log("")
		console.log(forced ? `${forcedIcon} ${description}` : description)
	}

	const onEnd = ({ skipped, passed, expired, value }) => {
		if (skipped) {
			// console.log(appendResult(`${skippedColor}${skippedIcon} skipped${endColor}`, value))
		} else if (expired) {
			console.log(appendResult(`${expiredColor}${expiredIcon} expired${endColor}`, value))
		} else if (passed) {
			console.log(appendResult(`${passedColor}${passedIcon} passed${endColor}`, value))
		} else {
			console.log(appendResult(`${failedColor}${failedIcon} failed${endColor}`, value))
		}
	}

	const after = (data) => {
		const testResults = data
		const testCount = testResults.length
		const skippedCount = testResults.filter(({ skipped }) => skipped).length
		const passedCount = testResults.filter(({ passed, skipped }) => passed && skipped === false)
			.length
		const failedCount = testResults.filter(({ passed }) => passed === false).length

		const categories = []
		categories.push(`${passedColor}${passedCount} passed${endColor}`)
		categories.push(`${failedColor}${failedCount} failed${endColor}`)
		categories.push(`${skippedColor}${skippedCount} skipped${endColor}`)

		console.log("")
		console.log(`${testCount} tests: ${categories.join(", ")}`)
	}

	const before = () => {
		console.log(`executing tests`)
	}

	before()
	return executeMany(tests, {
		onReady,
		onEnd,
		allocatedMs,
	}).then(
		(value) => {
			after(value)
			return value
		},
		(value) => {
			after(value)
			return value
		},
	)
}
