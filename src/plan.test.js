import { plan, collect } from "./plan.js"
import { test } from "@dmail/test-cheap"
import assert from "assert"

test("plan", ({ ensure }) => {
	ensure("collect and longDescriptions", () => {
		const testPlan = plan("yo", ({ test, scenario }) => {
			test("testA", () => {})

			scenario("scenarioA", () => {
				test("testB", () => {})

				scenario("scenarioAA", () => {
					test("testC", () => {})
				})

				test("testD", () => {})
			})

			test("testE", () => {})
		})
		const tests = collect(testPlan)
		const longDescriptions = tests.map((test) => test.getLongDescription())
		assert.deepEqual(longDescriptions, [
			"yo testA",
			"yo testE",
			"yo scenarioA testB",
			"yo scenarioA testD",
			"yo scenarioA scenarioAA testC",
		])
	})

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
})
