import { plan, collect } from "./plan.js"
import { executeOne } from "./execute.js"
import { test } from "@dmail/test-cheap"
// import { createSpy } from "@dmail/spy"
import assert from "assert"

const assertTestIsAndCalledWith = (test, id, param) => {
	const action = executeOne(test)
	assert.equal(action.getState(), "passed")
	const result = action.getResult()
	const testReturnValue = result.value
	assert.equal(testReturnValue.id, id)
	assert.equal(testReturnValue.args.length, 1)
	assert.deepEqual(testReturnValue.args[0], param)
}

test("plan", ({ ensure }) => {
	ensure("collect and execute", () => {
		const testPlan = plan(({ test, scenario }) => {
			test((...args) => ({
				id: "test-1",
				args,
			}))

			scenario(
				() => {
					const count = 1
					return { count }
				},
				() => {
					test((...args) => ({
						id: "test-3",
						args,
					}))

					scenario(
						({ count }) => {
							const incrementedCount = count + 1
							return { incrementedCount }
						},
						() => {
							test((...args) => ({
								id: "test-5",
								args,
							}))
						},
					)

					test((...args) => ({
						id: "test-4",
						args,
					}))
				},
			)

			test((...args) => ({
				id: "test-2",
				args,
			}))
		})
		const tests = collect(testPlan)

		assertTestIsAndCalledWith(tests[0], "test-1", {})
		assertTestIsAndCalledWith(tests[1], "test-2", {})
		assertTestIsAndCalledWith(tests[2], "test-3", { count: 1 })
		assertTestIsAndCalledWith(tests[3], "test-4", { count: 1 })
		assertTestIsAndCalledWith(tests[4], "test-5", { count: 1, incrementedCount: 2 })
	})

	/*
	ensure("collect and focus", () => {
		const testPlan = plan("foo", ({ test, scenario }) => {
			scenario("bar", () => {
				test("a")
				scenario("hhj", () => {
					test("d")
				})
			})

			scenario.focus("yyy", () => {
				test("b")
			})

			scenario("zzz", () => {
				test("c")
			})
		})
		const tests = collect(testPlan)
		const skippedTestDescriptions = tests
			.filter((test) => test.isSkipped())
			.map((test) => test.description)
		const focusedTestDescriptions = tests
			.filter((test) => test.isFocused())
			.map((test) => test.description)

		assert.deepEqual(skippedTestDescriptions, ["a", "d", "c"])
		assert.deepEqual(focusedTestDescriptions, [])
	})
	*/
})
