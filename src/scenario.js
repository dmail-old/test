import { pure, mixin } from "@dmail/mixin"

const focusable = () => {
	let focused = false

	const focus = () => {
		focused = true
	}

	const isFocused = () => focused

	return { isFocused, focus }
}

const skippable = () => {
	let skipped = false

	const skip = () => {
		skipped = true
	}

	const isSkipped = () => skipped

	return { isSkipped, skip }
}

const createTest = ({ description, fn }) => {
	return mixin(pure, focusable, skippable, () => {
		return { description, fn }
	})
}

const createPlan = ({ description, fn }) => {
	return mixin(pure, focusable, skippable, () => {
		let tests = []
		const getTests = () => tests

		const setTests = (value) => {
			tests = value
		}

		let plans = []
		const getPlans = () => plans

		const setPlans = (value) => {
			plans = value
		}

		return { description, fn, getTests, setTests, getPlans, setPlans }
	})
}

const createScenario = ({ description, fn }) => {
	return mixin(pure, focusable, skippable, ({ isFocused, isSkipped }) => {
		const collect = () => {
			const tests = []
			const discoverTest = (description, fn) => {
				const test = createTest({
					description,
					fn,
				})
				tests.push(test)
				return test
			}
			const test = (description, fn) => discoverTest(description, fn)
			test.focus = (description, fn) => {
				const test = discoverTest(description, fn)
				test.focus()
				return test
			}
			test.skip = (description, fn) => {
				const test = discoverTest(description, fn)
				test.skip()
				return test
			}

			const plans = []
			const discoverPlan = (description, fn) => {
				const plan = createPlan({
					description,
					fn,
				})
				plans.push(plan)
				return plan
			}
			const plan = (description, fn) => discoverPlan({ description, fn })
			plan.focus = (description, fn) => {
				const plan = discoverPlan({ description, fn })
				plan.focus()
				return plan
			}
			plan.skip = (description, fn) => {
				const plan = discoverPlan({ description, fn })
				plan.skip()
				return plan
			}

			const visitPlans = (plans) => {
				const plansCopy = plans.slice()
				plansCopy.forEach((plan) => {
					tests.length = 0
					plans.length = 0
					plan.fn()
					plan.setTests(tests)
					plan.setPlans(plans)
					visitPlans(plan)
				})
			}

			const rootPlan = createPlan({ description, fn })
			if (isFocused()) {
				rootPlan.focus()
			}
			if (isSkipped()) {
				rootPlan.skip()
			}
			fn({ test, plan })
			rootPlan.setTests(tests)
			rootPlan.setPlans(plans)
			visitPlans(plans)

			return rootPlan
		}

		return { description, collect }
	})
}

const scenario = (description, fn) => createScenario({ description, fn })
scenario.focus = (description, fn) => {
	const scenario = createScenario({ description, fn })
	scenario.focus()
	return scenario
}
scenario.skip = (description, fn) => {
	const scenario = createScenario({ description, fn })
	scenario.skip()
	return scenario
}

export { scenario }

export const collectFromScenarios = (scenarios) => {
	let someTestIsFocused = false
	const tests = []
	const someScenarioIsFocused = scenarios.map((scenario) => scenario.isFocused())

	const visitScenario = (scenario, skipBecauseSiblingScenarioFocused) => {
		const visitPlan = (plan, skipBecauseSiblingPlanFocused) => {
			const tests = plan.getTests()
			if (someTestIsFocused === false) {
				const someTestPlanIsFocused = tests.some((test) => {
					return test.isFocused()
				})
				if (someTestPlanIsFocused) {
					someTestIsFocused = true
					tests.forEach((test) => {
						if (test.isFocused() === false) {
							test.skip()
						}
					})
				}
			}

			tests.forEach((test) => {
				if (
					test.isFocused() === false &&
					(someTestIsFocused || skipBecauseSiblingPlanFocused || skipBecauseSiblingScenarioFocused)
				) {
					test.skip()
				}
				tests.push(test)
			})

			const plans = plan.getPlans()
			const somePlanIsFocused = plans.some((plan) => {
				return plan.isFocused()
			})

			plans.forEach((plan) => {
				visitPlan(
					plan,
					skipBecauseSiblingPlanFocused || (somePlanIsFocused && plan.isFocused() === false),
				)
			})
		}

		const rootPlan = scenario.collect()
		visitPlan(rootPlan)
	}

	scenarios.forEach((scenario) => {
		visitScenario(scenario, someScenarioIsFocused && scenario.isFocused() === false)
	})

	return tests
}
