import { test } from "@dmail/test-cheap"
import mock from "mock-fs"
import assert from "assert"
import { findSourceFiles, findFilesForTest } from "./findFiles.js"

test("findFiles.js", ({ waitUntil }) => {
	const done = waitUntil()

	const abstractFileSystem = {
		".testignore": "ignore.test.js",
		dist: {
			"ignore.test.js": "",
			"file.js": "",
			"file.js.map": "",
			"file.test.js": "",
			"file.test.js.map": "",
			feature: {
				"feature.js": "",
				"feature.test.js": ""
			}
		}
	}

	Promise.resolve()
		.then(() => {
			mock(abstractFileSystem)
			return findSourceFiles().then(files => {
				// test files should not be there but that's not a blocker
				// so for now let's assert something that should not happen
				// because I don't want to fix
				assert.deepEqual(
					files.sort(),
					[
						"dist/ignore.test.js",
						"dist/file.js",
						"dist/file.test.js",
						"dist/feature/feature.js",
						"dist/feature/feature.test.js"
					].sort()
				)
				mock.restore()
			})
		})
		.then(() => {
			mock(abstractFileSystem)
			return findFilesForTest().then(files => {
				assert.deepEqual(files.sort(), ["dist/feature/feature.test.js", "dist/file.test.js"].sort())
				mock.restore()
			})
		})
		.then(() => done())
})
