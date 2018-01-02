import { createSuite } from "./createSuite.js"
import { test as createTest } from "./createTest.js"
import { test } from "@dmail/test-cheap"
import { createAction, failed } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"

test("createTest.js", ({ ensure }) => {
	ensure("test runned in serie", () => {
		const firstAction = createAction()
		const secondAction = createAction()
		const firstSpy = createSpy(() => firstAction)
		const secondSpy = createSpy(() => secondAction)
		const { run } = createSuite(createTest("first", firstSpy), createTest("second", secondSpy))
		run()
		assert.equal(firstSpy.getReport(0).called, true)
		assert.equal(secondSpy.getReport(0).called, false)
		firstAction.pass()
		assert.equal(secondSpy.getReport(0).called, true)
	})

	ensure("failure are collected", () => {
		const firstValue = 1
		const secondValue = 2
		const { run } = createSuite(
			createTest("first", () => failed(firstValue)),
			createTest("second", () => failed(secondValue)),
		)
		const action = run()
		assert.deepEqual(action.getResult(), [
			{
				state: "failed",
				value: firstValue,
				forced: false,
				skipped: false,
			},
			{
				state: "failed",
				value: secondValue,
				forced: false,
				skipped: false,
			},
		])
	})

	// it's a bit harder to test, a kind of duplicate of testing
	// made in collectSequencWithAllocatedMs done in action.js
	// ensure("expectation inherits remainingms", () => {
	// 	const clock = install()
	// 	const allocatedMs = 100
	// 	const consumedMs = 50

	// 	const run = createTestRunner(
	// 		createTest("first", () => {
	// 			clock.tick(consumedMs)
	// 			return passed()
	// 		}),
	// 		createTest("second", () => {}),
	// 	)
	// 	run({
	// 		allocatedMs,
	// 	})
	// 	clock.uninstall()
	// })
})
