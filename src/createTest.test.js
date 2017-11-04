import { createTest } from "./createTest.js"
import { test } from "@dmail/test-cheap"
import { createAction } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

test("createTest.js", ({ ensure }) => {
	ensure("return a function to run expectations", () => {
		const expectationDescription = "desc"
		const expectationFunction = createSpy(({ pass }) => pass("hello world"))
		const beforeEach = createSpy()
		const afterEach = createSpy()
		const test = createTest({
			[expectationDescription]: expectationFunction
		})

		const action = test({
			allocatedMs: 10,
			beforeEach,
			afterEach
		})

		assert.equal(action.getState(), "passed")
		assert.deepEqual(action.getResult(), [
			{
				state: "passed",
				result: "hello world"
			}
		])
		assert.deepEqual(beforeEach.getReport(0).argValues, [expectationDescription])
		assert.deepEqual(afterEach.getReport(0).argValues, [
			expectationDescription,
			"hello world",
			true
		])
		assert.equal(typeof expectationFunction.getReport(0).argValues[0].allocateMs, "function")
	})

	ensure("afterEach on failed test", () => {
		const afterEach = createSpy()
		const description = "desc"
		const value = 1
		const test = createTest({
			[description]: ({ fail }) => fail(value)
		})
		test({
			afterEach
		})
		assert.deepEqual(afterEach.getReport(0).argValues, [description, value, false])
	})

	ensure("expectation taking too much time to pass", () => {
		const clock = install()
		const allocatedMs = 10
		const requiredMs = 100

		const test = createTest({
			"expectation passing too late": ({ pass }) => setTimeout(pass, requiredMs)
		})
		const action = test({
			allocatedMs
		})

		assert.equal(action.getState(), "unknown")
		clock.tick(allocatedMs)
		assert.equal(action.getState(), "failed")
		assert.deepEqual(action.getResult(), `must pass or fail in less than ${allocatedMs}ms`)
		assert.doesNotThrow(() => clock.tick(requiredMs))

		clock.uninstall()
	})

	ensure("expectation can extend its allocated ms", () => {
		const clock = install()
		const allocatedMs = 10
		const requiredMs = 100
		const test = createTest({
			"expectation with its own allocatedMs": ({ pass, allocateMs }) => {
				allocateMs(requiredMs + 1)
				setTimeout(pass, requiredMs)
			}
		})
		const action = test({
			allocatedMs
		})
		clock.tick(allocatedMs)
		assert.equal(action.getState(), "unknown")
		clock.tick(requiredMs)
		assert.equal(action.getState(), "passed")

		clock.uninstall()
	})

	ensure("expectation are runned in serie", () => {
		const firstAction = createAction()
		const secondAction = createAction()
		const firstSpy = createSpy(() => firstAction)
		const secondSpy = createSpy(() => secondAction)
		const test = createTest({
			first: firstSpy,
			second: secondSpy
		})
		test()
		assert.equal(firstSpy.getReport(0).called, true)
		assert.equal(secondSpy.getReport(0).called, false)
		firstAction.pass()
		assert.equal(secondSpy.getReport(0).called, true)
	})

	ensure("failure are collected", () => {
		const firstValue = 1
		const secondValue = 2
		const test = createTest({
			first: ({ fail }) => fail(firstValue),
			second: ({ fail }) => fail(secondValue)
		})
		const action = test()
		assert.deepEqual(action.getResult(), [
			{
				state: "failed",
				result: firstValue
			},
			{
				state: "failed",
				result: secondValue
			}
		])
	})

	ensure("expectation inherits remainingms", () => {
		const clock = install()
		const allocatedMs = 100
		const consumedMs = 50

		const test = createTest({
			first: ({ pass }) => {
				clock.tick(consumedMs)
				pass()
			},
			second: ({ getAllocatedMs }) => {
				assert.equal(getAllocatedMs(), allocatedMs - consumedMs)
			}
		})
		test({
			allocatedMs
		})
		clock.uninstall()
	})
})
