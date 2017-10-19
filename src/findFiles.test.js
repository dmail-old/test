import { test } from "@dmail/test-cheap"
import mock from "mock-fs"
import assert from "assert"
import { findFilesForTest } from "./findFiles.js"

test("findFiles.js", ({ waitUntil }) => {
	const done = waitUntil()

	const abstractFileSystem = {
		".testignore": "ignore.test.js",
		dist: {
			"ignore.test.js": "",
			"file.test.js": "",
			feature: {
				"feature.js": "",
				"feature.test.js": ""
			}
		}
	}

	mock(abstractFileSystem)

	findFilesForTest().then(files => {
		assert.deepEqual(files.sort(), ["dist/feature/feature.test.js", "dist/file.test.js"])
		mock.restore()
		done()
	})
})
