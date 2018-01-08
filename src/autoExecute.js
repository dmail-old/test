import { executeMany } from "./execute.js"
import {
	forcedIcon,
	passedIcon,
	failedIcon,
	skippedIcon,
	passedColor,
	failedColor,
	skippedColor,
	expiredIcon,
	expiredColor,
	endColor,
} from "./styles.js"

/* istanbul ignore next: internal usage, not meant to be used nor maintained */
export const autoExecute = (tests, { allocatedMs } = {}) => {
	tests = tests.map(({ getLongDescription, fn, isFocused, isSkipped }) => {
		return {
			description: getLongDescription(),
			implementation: fn,
			focused: isFocused(),
			skipped: isSkipped(),
		}
	})

	const appendResult = (string, value) => {
		if (value) {
			return `${string} with ${value}`
		}
		return string
	}

	const onReady = ({ description, forced }) => {
		console.log("")
		console.log(forced ? `${forcedIcon} ${description}` : description)
	}

	const onEnd = ({ skipped, passed, expired, value }) => {
		if (skipped) {
			console.log(appendResult(`${skippedColor}${skippedIcon} skipped${endColor}`, value))
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
		const passedCount = testResults.filter(({ passed }) => passed).length
		const failedCount = testResults.filter(({ passed }) => passed === false).length

		console.log("")
		if (failedCount === 0) {
			console.log(
				`${passedColor}${passedIcon} ${passedCount} tests passed${endColor} on ${testCount}${endColor}`,
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
