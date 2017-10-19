import { composeSequenceWithAllocatedMs, mutateAction } from "@dmail/action"

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
		composeSequenceWithAllocatedMs(
			expectations,
			(action, { description, fn }) => {
				beforeEach(description)
				mutateAction(action, fn).then(
					result => afterEach(description, result, true),
					result => afterEach(description, result, false)
				)
				return action
			},
			allocatedMs
		)

	runTest["@@autorun"] = () =>
		runTest({
			beforeEach: description => {
				console.log(description)
			},
			afterEach: (description, result, passed) => {
				if (passed) {
					console.log(`passed${result ? `: ${result}` : ""}`)
				} else {
					console.log(`failed${result ? `: ${result}` : ""}`)
				}
			}
		})

	return runTest
}
