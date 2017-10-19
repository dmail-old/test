import { createPackageTest } from "./createPackageTest.js"
import { test } from "@dmail/test-cheap"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import mock from "mock-fs"

test("ensure.js", ({ ensure }) => {
	// c'est potentiellement assez complexe à tester tout ça...
	const abstractFileSystem = {
		dist: {
			"test.js": ""
		}
	}
	mock(abstractFileSystem)

	ensure("return a function to run test for found test files", () => {
		const beforeEachFile = createSpy()
		const afterEachFile = createSpy()
		const beforeEachTest = createSpy()
		const afterEachTest = createSpy()

		createPackageTest({
			beforeEachFile,
			afterEachFile,
			beforeEachTest,
			afterEachTest
		})
	})
})
