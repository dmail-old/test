import { collectSequenceWithAllocatedMs, mapIterable, passed } from "@dmail/action"
import { passedIcon, failedIcon, passedColor, failedColor, endColor } from "./styles.js"

export const createTest = (description, fn) => {
	return { description, fn }
}
createTest.force = (description, fn) => {
	return { description, fn, force: true }
}
export { createTest as test }

export const createTestRunner = (...tests) => {
	const runTest = ({ beforeEach = () => {}, afterEach = () => {}, allocatedMs } = {}) => {
		return collectSequenceWithAllocatedMs(
			mapIterable(tests, ({ description, fn }) => {
				beforeEach({ description })
				return passed(fn()).then(
					(result) => afterEach({ description, result, passed: true }),
					(result) => afterEach({ description, result, passed: false }),
				)
			}),
			{
				allocatedMs,
			},
		)
	}

	/* istanbul ignore next: internal usage, not meant to be used nor maintained */
	runTest["@@autorun"] = (filepath) => {
		const appendResult = (string, result) => {
			if (result) {
				return `${string}: ${result}`
			}
			return string
		}

		console.log(`autorun test file ${filepath}`)
		runTest({
			beforeEach: (description) => {
				console.log("")
				console.log(description)
			},
			afterEach: (description, result, passed) => {
				if (passed) {
					console.log(appendResult(`${passedColor}${passedIcon} passed${endColor}`, result))
				} else {
					console.log(appendResult(`${failedColor}${failedIcon} failed${endColor}`, result))
				}
			},
		}).then(
			(data) => {
				console.log("")
				console.log(`${passedColor}${passedIcon} ${data.length} tests passed${endColor}`)
			},
			(data) => {
				if (typeof data === "string") {
					console.log(`CRITICAL FAILURE: ${data}`)
					return
				}

				const failedCount = data.filter(({ state }) => state === "failed").length

				console.log("")
				console.log(
					`${failedColor}${failedIcon} ${failedCount} failed tests on ${data.length}${endColor}`,
				)
			},
		)
	}

	return runTest
}
