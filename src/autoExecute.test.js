import { autoExecute } from "./autoExecute.js"
import { test } from "@dmail/test-cheap"
import { createAction } from "@dmail/action"
import { install } from "lolex"

test("autoExecute", ({ ensure, waitUntil }) => {
	const done = waitUntil()
	ensure("basics", () => {
		const clock = install()
		const action = createAction()
		autoExecute(
			[
				{
					fileName: "file",
					lineNumber: 5,
					columnNumber: 10,
					isSkipped: () => false,
					isFocused: () => false,
					getScenarios: () => [],
					fn: () => action,
				},
			],
			{
				allocatedMs: 100,
			},
		)
		clock.tick(100)
		clock.uninstall()
	})

	done()
})
