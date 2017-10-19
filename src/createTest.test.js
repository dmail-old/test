import { test } from "@dmail/test-cheap"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { createTest } from "./createTest.js"

test("ensure.js", ({ ensure }) => {
	// faut tester que: la fonction run à allocatedMs pour se résoudre
	// chaque expectation "hérite" de remainingMs
	// chaque expectation est run en série
	// lorsqu'une expectation fail la suivante est quand même run
	// le résultat de run est un report de chaque expectation indiquant fail/passed
	// beforeEach, afterEach est applé avant/après chaque expectation
	// la fonctionnalité @@autorun

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
})
