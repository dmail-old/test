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

const createTest = ({ fn, fileName, lineNumber, columnNumber }) => {
	return mixin(pure, focusable, skippable, () => {
		const scenarios = []
		const setScenarios = (value) => {
			scenarios.push(...value)
		}

		const getScenarios = () => scenarios

		return { fn, fileName, lineNumber, columnNumber, setScenarios, getScenarios }
	})
}

const createScenario = ({ generate, ensure }) => {
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

		return { generate, ensure, getTests, setTests, getScenarios, setScenarios }
	})
}

// https://github.com/v8/v8/wiki/Stack-Trace-API
const getExternalCallerStack = () => {
	const { prepareStackTrace } = Error
	let callerStack

	try {
		const error = new Error()

		Error.prepareStackTrace = (error, stack) => stack

		const stack = error.stack
		const currentFileName = stack[0].getFileName()

		callerStack = stack.slice(1).find((callStack) => {
			return callStack.getFileName() !== currentFileName
		})
	} catch (e) {}

	Error.prepareStackTrace = prepareStackTrace

	return callerStack
}

const createPlan = ({ fn }) => {
	return mixin(pure, focusable, skippable, ({ isFocused, isSkipped, getLastComposite }) => {
		const createRootScenario = () => {
			const tests = []
			const discoverTest = (fn) => {
				const caller = getExternalCallerStack()
				const fileName = caller.getFileName()
				const lineNumber = caller.getLineNumber()
				const columnNumber = caller.getColumnNumber()
				const test = createTest({
					fn,
					fileName,
					lineNumber,
					columnNumber,
				})
				tests.push(test)
				return test
			}

			// https://github.com/stefanpenner/get-caller-file
			const test = (fn) => discoverTest(fn)
			test.focus = (fn) => {
				const test = discoverTest(fn)
				test.focus()
				return test
			}
			test.skip = (fn) => {
				const test = discoverTest(fn)
				test.skip()
				return test
			}

			const scenarios = []
			const discoverScenario = (generate, ensure) => {
				const scenario = createScenario({
					generate,
					ensure,
				})
				scenarios.push(scenario)
				return scenario
			}
			const scenario = (generate, ensure) => discoverScenario(generate, ensure)
			scenario.focus = (generate, ensure) => {
				const scenario = discoverScenario(generate, ensure)
				scenario.focus()
				return scenario
			}
			scenario.skip = (generate, ensure) => {
				const scenario = discoverScenario(generate, ensure)
				scenario.skip()
				return scenario
			}

			const visitScenarios = (scenariosToVisit) => {
				scenariosToVisit.forEach((scenarioToVisit) => {
					tests.length = 0
					scenarios.length = 0
					scenarioToVisit.ensure()
					scenarioToVisit.setTests(tests)
					scenarioToVisit.setScenarios(scenarios)
					visitScenarios(scenarioToVisit.getScenarios())
				})
			}

			fn({ test, scenario })

			const rootScenario = createScenario({})
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

		return { createRootScenario, ["@@autorun"]: autorun }
	})
}

const plan = (fn) => createPlan({ fn })
plan.focus = (fn) => {
	const plan = createPlan({ fn })
	plan.focus()
	return plan
}
plan.skip = (fn) => {
	const plan = createPlan({ fn })
	plan.skip()
	return plan
}

export { plan }
