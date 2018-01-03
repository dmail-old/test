import { createTemplate, compileMany } from "./createTemplate.js"
import { createTest } from "./createTest.js"
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
export const autoRunPlan = (plan) => {
	const appendResult = (string, value) => {
		if (value) {
			return `${string} with ${value}`
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

	const before = ({ description }) => {
		console.log(`autorun ${description}`)
	}

	return plan.execute({
		before,
		beforeEach,
		afterEach,
		after,
	})
}

export const createPlan = (description, fn) => {
	return createTemplate({
		description,
		parse: () => {
			const rawTests = []
			const collectTests = ({ description, fn, forced = false, skipped = false }) => {
				const createLocalTest = ({ description: testDescription, fn: testFn }) => {
					const test = {
						description: `${description} ${testDescription}`,
						fn: testFn,
						forced,
						skipped,
					}
					rawTests.push(test)
					return test
				}
				const test = (description, fn) => {
					return createLocalTest({ description, fn })
				}
				test.force = (description, fn) => {
					return createLocalTest({ description, fn, forced: true })
				}
				test.skip = (description, fn) => {
					return createLocalTest({ description, fn, skipped: true })
				}

				const createLocalPlan = (properties) => {
					const plan = {
						description: `${description} ${properties.description}`,
						fn: properties.fn,
					}
					collectTests(plan)
					return plan
				}
				const plan = (description, fn) => {
					return createLocalPlan({ description, fn })
				}
				plan.force = (description, fn) => {
					return createLocalPlan({ description, fn, forced: true })
				}
				plan.skip = (description, fn) => {
					return createLocalPlan({ description, fn, skipped: true })
				}

				fn({ test, plan })
			}
			collectTests({ description, fn })

			const tests = rawTests.map(({ description, fn, forced, skipped }) => {
				const test = createTest({ description, fn })
				if (forced) {
					test.force()
				}
				if (skipped) {
					test.skip()
				}
				return test
			})

			return {
				parsed: tests,
				compile: (param) => compileMany(tests, param),
			}
		},
	})
}
