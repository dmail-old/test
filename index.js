import { test, collect } from "./src/createTest.js"
import { run } from "./src/run.js"

export { isAssertionError, createAssertionError, executeOne, executeMany } from "./src/execute.js"
export { run }
export { test, collect }

const __test__ = (...args) => {
	return collect().then((tests) => {
		return run(tests, ...args)
	})
}

if (typeof window === "object") {
	window.__test__ = __test__
} else if (typeof global === "object") {
	global.__test__ = __test__
}
