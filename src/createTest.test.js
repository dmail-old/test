import { test, collect } from "./createTest.js"
import { test as testCheap } from "@dmail/test-cheap"
import assert from "assert"

testCheap("createTest", ({ ensure }) => {
	ensure("collect", () => {
		const testA = test(() => {})
		const testB = test(() => {})
		const tests = collect()

		assert.deepEqual(tests, [testA, testB])
	})

	ensure("collect with test.focus", () => {
		const fn = () => {}
		test(fn)
		test.focus(() => {})
		const tests = collect()

		assert.equal(tests[0].fn, fn)
		assert.equal(tests[0].isSkipped(), true)
		assert.equal(tests[1].isFocused(), true)
	})
})
