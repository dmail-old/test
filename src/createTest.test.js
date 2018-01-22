import { test as createTest, collect } from "./createTest.js"
// import { executeOne } from "./execute.js"
import { test } from "@dmail/test-cheap"
// import { createSpy } from "@dmail/spy"
import assert from "assert"

test("createTest", ({ ensure }) => {
	ensure("collect", () => {
		const testA = createTest(() => {})
		const testB = createTest(() => {})
		const tests = collect()

		assert.deepEqual(tests, [testA, testB])
	})

	ensure("collect with test.focus", () => {})

	ensure("collect using test.skip", () => {})

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
