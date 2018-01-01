import { createTest } from "./createTest.js"
import { test } from "@dmail/test-cheap"
import { createAction, failed, passed } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

test("createTest.js", ({ ensure }) => {
	ensure("return a function to run", () => {
		const description = "desc"
		const fn = () => passed("hello world")
		const before = createSpy()
		const after = createSpy()
		const { run } = createTest({ description, fn })

		const action = run({
			allocatedMs: 10,
			before,
			after,
		})

		assert.equal(action.getState(), "passed")
		assert.deepEqual(action.getResult(), [
			{
				state: "passed",
				value: "hello world",
				forced: false,
				skipped: false,
			},
		])
		assert.deepEqual(before.getReport(0).argValues, [{ description }])
		assert.deepEqual(after.getReport(0).argValues, [
			{
				description,
				value: "hello world",
				passed: true,
				forced: false,
				skipped: false,
			},
		])
	})

	ensure("after on failed test", () => {
		const after = createSpy()
		const description = "desc"
		const value = 1
		const fn = () => failed(value)
		const { run } = createTest({ description, fn })
		run({
			after,
		})
		assert.deepEqual(after.getReport(0).argValues, [{ description, value, passed: false }])
	})

	ensure("test taking too much time to pass", () => {
		const clock = install()
		const allocatedMs = 10
		const requiredMs = 100
		const description = "passing too late"
		const fn = () => {
			const action = createAction()
			setTimeout(action.pass, requiredMs)
			return action
		}

		const { run } = createTest({ description, fn })
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
})
