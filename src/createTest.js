import { composeSequenceWithAllocatedMs, mutateAction } from "@dmail/action"
import { passedIcon, failedIcon, passedColor, failedColor, endColor } from "./styles.js"

const createExpectationsFromObject = expectationsObject =>
	Object.keys(expectationsObject).map(description => {
		return {
			description,
			fn: expectationsObject[description]
		}
	})

export const createTest = expectationsObject => {
	const expectations = createExpectationsFromObject(expectationsObject)
	const runTest = ({ beforeEach = () => {}, afterEach = () => {}, allocatedMs } = {}) =>
		composeSequenceWithAllocatedMs(expectations, {
			handle: (action, { description, fn }) => {
				beforeEach(description)
				mutateAction(action, fn).then(
					result => afterEach(description, result, true),
					result => afterEach(description, result, false)
				)
				return action
			},
			allocatedMs
		})

	/* istanbul ignore next: internal usage, not meant to be used nor maintained */
	runTest["@@autorun"] = filepath => {
		const appendResult = (string, result) => {
			if (result) {
				return `${string}: ${result}`
			}
			return string
		}

		console.log(`autorun test file ${filepath}`)
		runTest({
			beforeEach: description => {
				console.log("")
				console.log(description)
			},
			afterEach: (description, result, passed) => {
				if (passed) {
					console.log(appendResult(`${passedColor}${passedIcon} passed${endColor}`, result))
				} else {
					console.log(appendResult(`${failedColor}${failedIcon} failed${endColor}`, result))
				}
			}
		}).then(data => {
			const failedCount = data.filter(({ state }) => state === "failed").length
			const passedCount = data.filter(({ state }) => state === "passed").length
			const passed = failedCount === 0

			console.log("")
			if (passed) {
				console.log(`${passedColor}${passedIcon} ${passedCount} tests passed${endColor}`)
			} else {
				console.log(
					`${failedColor}${failedIcon} ${failedCount} failed tests on ${data.length}${endColor}`
				)
			}
		})
	}

	return runTest
}
