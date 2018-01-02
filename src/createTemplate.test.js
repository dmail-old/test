import { createTemplate } from "./createTemplate.js"
import { test } from "@dmail/test-cheap"
import { createAction, failed } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

test("createTemplate", ({ ensure }) => {
	ensure("implementation basics", () => {
		const clock = install()
		const description = "desc"
		const action = createAction()
		const implementation = () => action
		const before = createSpy()
		const after = createSpy()
		const { run } = createTemplate({ description, implementation })
		const nowMs = Date.now()

		const templateAction = run({
			allocatedMs: 10,
			before,
			after,
		})
		clock.tick(9)
		action.pass("hello world")

		assert.deepEqual(before.getReport(0).argValues, [
			{
				description,
				forced: false,
				skipped: false,
				startMs: nowMs,
			},
		])
		assert.deepEqual(after.getReport(0).argValues, [
			{
				description,
				forced: false,
				skipped: false,
				expired: false,
				startMs: nowMs,
				endMs: nowMs + 9,
				passed: true,
				value: "hello world",
			},
		])
		assert.equal(templateAction.getState(), "passed")
		assert.deepEqual(templateAction.getResult(), {
			description,
			forced: false,
			skipped: false,
			startMs: nowMs,
			endMs: nowMs + 9,
			expired: false,
			passed: true,
			value: "hello world",
		})

		clock.uninstall()
	})

	ensure("implementation failed", () => {
		const description = "desc"
		const value = 1
		const implementation = () => failed(value)
		const { run } = createTemplate({ description, implementation })
		const action = run()
		assert.equal(action.isFailed(), true)
		const result = action.getResult()
		assert.deepEqual(result.passed, false)
		assert.deepEqual(result.value, value)
	})

	ensure("implementation taking too much time to pass", () => {
		const clock = install()
		const allocatedMs = 10
		const requiredMs = 100
		const description = "passing too late"
		const implementation = () => {
			const action = createAction()
			setTimeout(action.pass, requiredMs)
			return action
		}

		const { run } = createTemplate({ description, implementation })
		const action = run({
			allocatedMs,
		})

		assert.equal(action.getState(), "unknown")
		clock.tick(allocatedMs)
		assert.equal(action.getState(), "failed")
		assert.deepEqual(action.getResult().expired, true)
		assert.doesNotThrow(() => clock.tick(requiredMs))

		clock.uninstall()
	})
})
