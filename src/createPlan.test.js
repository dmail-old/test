import { createPlan } from "./createPlan.js"
import { test } from "@dmail/test-cheap"
import { createAction } from "@dmail/action"
import { createSpy } from "@dmail/spy"
import { install } from "lolex"

test("createPlan", ({ ensure }) => {
	ensure("basics", () => {
		const clock = install()
		const firstAction = createAction()
		const secondAction = createAction()
		const thirdAction = createAction()

		const plan = createPlan("root", ({ plan, test }) => {
			test("first", () => firstAction)

			plan("nested", ({ test }) => {
				test("deep", () => secondAction)
			})

			test("last", () => thirdAction)
		})

		const before = createSpy()
		const after = createSpy()
		const beforeEach = createSpy()
		const afterEach = createSpy()

		plan.run({
			before,
			after,
			beforeEach,
			afterEach,
		})

		clock.uninstall()
	})
})
