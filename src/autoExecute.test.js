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
					getLongDescription: () => "long",
					isSkipped: () => false,
					isFocused: () => false,
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
