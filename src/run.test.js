import { test } from "./createTest.js"
import { autoExecute } from "./autoExecute.js"
import { test as testCheap } from "@dmail/test-cheap"
import { createAction } from "@dmail/action"
import { install } from "lolex"

testCheap("autoExecute", ({ ensure, waitUntil }) => {
	const done = waitUntil()
	ensure("basics", () => {
		const clock = install()
		const action = createAction()
		autoExecute([test(() => action)], {
			allocatedMs: 100,
		})
		clock.tick(100)
		clock.uninstall()
	})

	done()
})
