import { createTest, createTestRunner } from "./createTestRunner.js"
import { test } from "@dmail/test-cheap"
import { createAction, failed, passed } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

test("createTest.js", ({ ensure }) => {
	ensure("return a function to run", () => {
		const description = "desc"
		const beforeEach = createSpy()
		const afterEach = createSpy()
		const test = createTest(description, passed("hello world"))
		const run = createTestRunner(test)

		const action = run({
			allocatedMs: 10,
			beforeEach,
			afterEach,
		})

		assert.equal(action.getState(), "passed")
		assert.deepEqual(action.getResult(), [
			{
				state: "passed",
				result: "hello world",
			},
		])
		assert.deepEqual(beforeEach.getReport(0).argValues, { description })
		assert.deepEqual(afterEach.getReport(0).argValues, {
			description,
			result: "hello world",
			passed: true,
		})
	})

	ensure("afterEach on failed test", () => {
		const afterEach = createSpy()
		const description = "desc"
		const result = 1
		const test = createTest(description, () => failed(result))
		const run = createTestRunner(test)
		run({
			afterEach,
		})
		assert.deepEqual(afterEach.getReport(0).argValues, { description, result, passed: false })
	})

	ensure("expectation taking too much time to pass", () => {
		const clock = install()
		const allocatedMs = 10
		const requiredMs = 100

		const test = createTest("expectation passing too late", () => {
			const action = createAction()
			setTimeout(action.pass, requiredMs)
			return action
		})
		const run = createTestRunner(test)
		const action = run({
			allocatedMs,
		})

		assert.equal(action.getState(), "unknown")
		clock.tick(allocatedMs)
		assert.equal(action.getState(), "failed")
		assert.deepEqual(action.getResult(), `must pass or fail in less than ${allocatedMs}ms`)
		assert.doesNotThrow(() => clock.tick(requiredMs))

		clock.uninstall()
	})

	ensure("expectation are runned in serie", () => {
		const firstAction = createAction()
		const secondAction = createAction()
		const firstSpy = createSpy(() => firstAction)
		const secondSpy = createSpy(() => secondAction)
		const run = createTestRunner(createTest("first", firstSpy), createTest("second", secondSpy))
		run()
		assert.equal(firstSpy.getReport(0).called, true)
		assert.equal(secondSpy.getReport(0).called, false)
		firstAction.pass()
		assert.equal(secondSpy.getReport(0).called, true)
	})

	ensure("failure are collected", () => {
		const firstValue = 1
		const secondValue = 2
		const run = createTestRunner(
			createTest("first", () => failed(firstValue)),
			createTest("second", () => failed(secondValue)),
		)
		const action = run()
		assert.deepEqual(action.getResult(), [
			{
				state: "failed",
				result: firstValue,
			},
			{
				state: "failed",
				result: secondValue,
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
