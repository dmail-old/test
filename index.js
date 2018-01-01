/*

import { test, testGroup } from "@dmail/test"

export const unit = testGroup(
  "mixin",
  test("returns true when ..."),
  test("returns false when ...")
)

export const scenario = testGroup(
  "a feature",
  testGroup(
    "feature a",
    test("something"),
    test("something else")
  ),
  testGroup(
    "feature b",
    test("", () => {})
  )
)

*/

// we are running tests in sequence and not in parallel because they are likely going to fail
// when they fail we want the failure to be reproductible, if they run in parallel we introduce
// race condition, non determinism, etc: bad idea

import { createTest } from "./src/createTest.js"
import { createGroup } from "./src/createGroup.js"

const test = (description, fn) => createTest({ description, fn })

test.force = (description, fn) => {
	const test = createTest({ description, fn })
	test.force()
	return test
}
test.skip = (description, fn) => {
	const test = createTest({ description, fn })
	test.skip()
	return test
}

export { test }

export const testGroup = (description, ...tests) =>
	createTest({ description, fn: createGroup(...tests) })

export * from "./src/findFiles.js"
