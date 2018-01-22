import { pure, mixin } from "@dmail/mixin"
import { autoExecute } from "./autoExecute.js"

export const collect = (...plans) => {
	let someTestIsFocused = false
	const tests = []
	const somePlanIsFocused = plans.some((plan) => plan.isFocused())

	const visit = (scenario, { focused, parentScenarios }) => {
		const ownTests = scenario.getTests()
		if (someTestIsFocused === false) {
			const someOwnTestIsFocused = ownTests.some(({ isFocused }) => isFocused())
			if (someOwnTestIsFocused) {
				someTestIsFocused = true
			}
		}

		ownTests.forEach((ownTest) => {
			if (ownTest.isFocused() === false && scenario.isFocused() === false && focused) {
				ownTest.skip()
			}
			ownTest.setScenarios(parentScenarios)
			tests.push(ownTest)
		})

		const ownScenarios = scenario.getScenarios()
		if (focused === false) {
			const someOwnScenarioIsFocused = ownScenarios.some(({ isFocused }) => isFocused())
			if (someOwnScenarioIsFocused) {
				focused = true
			}
		}

		ownScenarios.forEach((ownScenario) =>
			visit(ownScenario, { focused, parentScenarios: [ownScenario, ...parentScenarios] }),
		)
	}

	plans.forEach((plan) => {
		const rootScenario = plan.createRootScenario()
		visit(rootScenario, {
			focused: somePlanIsFocused,
			parentScenarios: [rootScenario],
		})
	})

	if (someTestIsFocused) {
		tests.forEach(({ isFocused, skip }) => {
			if (isFocused() === false) {
				skip()
			}
		})
	}

	return tests
}

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
		const scenarios = []
		const setScenarios = (value) => {
			scenarios.push(...value)
		}

		const getLongDescription = () => {
			return scenarios.reduce((previous, scenario) => {
				return `${scenario.description} ${previous}`
			}, description)
		}

		return { description, fn, setScenarios, getLongDescription }
	})
}

const createScenario = ({ description, fn }) => {
	return mixin(pure, focusable, skippable, () => {
		const tests = []
		const getTests = () => tests

		const setTests = (value) => {
			tests.push(...value)
		}

		const scenarios = []
		const getScenarios = () => scenarios

		const setScenarios = (value) => {
			scenarios.push(...value)
		}

		return { description, fn, getTests, setTests, getScenarios, setScenarios }
	})
}

const createPlan = ({ description, fn }) => {
	return mixin(pure, focusable, skippable, ({ isFocused, isSkipped, getLastComposite }) => {
		const createRootScenario = () => {
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

			const scenarios = []
			const discoverScenario = (description, fn) => {
				const scenario = createScenario({
					description,
					fn,
				})
				scenarios.push(scenario)
				return scenario
			}
			const scenario = (description, fn) => discoverScenario(description, fn)
			scenario.focus = (description, fn) => {
				const scenario = discoverScenario(description, fn)
				scenario.focus()
				return scenario
			}
			scenario.skip = (description, fn) => {
				const scenario = discoverScenario(description, fn)
				scenario.skip()
				return scenario
			}

			const visitScenarios = (scenariosToVisit) => {
				scenariosToVisit.forEach((scenarioToVisit) => {
					tests.length = 0
					scenarios.length = 0
					scenarioToVisit.fn()
					scenarioToVisit.setTests(tests)
					scenarioToVisit.setScenarios(scenarios)
					visitScenarios(scenarioToVisit.getScenarios())
				})
			}

			fn({ test, scenario })

			const rootScenario = createScenario({ description })
			if (isFocused()) {
				rootScenario.focus()
			}
			if (isSkipped()) {
				rootScenario.skip()
			}
			rootScenario.setTests(tests)
			rootScenario.setScenarios(scenarios)

			visitScenarios(scenarios.slice())

			return rootScenario
		}

		const autorun = () => autoExecute(collect(getLastComposite()), { allocatedMs: 100 })

		return { description, createRootScenario, ["@@autorun"]: autorun }
	})
}

const plan = (description, fn) => createPlan({ description, fn })
plan.focus = (description, fn) => {
	const plan = createPlan({ description, fn })
	plan.focus()
	return plan
}
plan.skip = (description, fn) => {
	const plan = createPlan({ description, fn })
	plan.skip()
	return plan
}

export { plan }
