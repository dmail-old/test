export const isAssertionError = () => false

export const createAssertionError = () => {}

export const executeOne = (
	{ fn, isFocused, isSkipped, description },
	{ before = () => {}, after = () => {}, allocatedMs = Infinity } = {},
) => {
	// the test may register a cleanup callback to remove stuff once done
	// we're ;issing a way to kill the test while its running
	let cleanupCallback = () => {}
	const cleanup = (callback) => {
		cleanupCallback = callback
	}

	const implementation = () => fn({ cleanup })

	const focused = isFocused()

	const skipped = isSkipped()

	const startMs = Date.now()

	before({ description, focused, skipped, startMs })

	let expired = false

	let passed = false

	let value

	const end = () => {
		const endMs = Date.now()
		const result = {
			description,
			focused,
			skipped,
			startMs,
			endMs,
			expired,
			passed,
			value,
		}
		after(result)
		return result
	}

	if (skipped) {
		return Promise.resolve(end())
	}

	let timeout

	return Promise.race([
		new Promise((resolve) => {
			resolve(implementation())
		}).then(
			(arg) => {
				clearTimeout(timeout)
				cleanupCallback()
				passed = true
				value = arg
				return end()
			},
			(reason) => {
				clearTimeout(timeout)
				cleanupCallback()
				if (isAssertionError(reason)) {
					passed = false
					value = reason
					return end()
				}
				return Promise.reject(reason)
			},
		),
		new Promise((resolve) => {
			timeout = setTimeout(resolve, allocatedMs)
		}).then(() => {
			expired = true
			cleanupCallback()
			return end()
		}),
	])
}

export const executeMany = (tests, options) => {
	// we could add an option to run them in sequence rather than parallel
	return Promise.all(
		tests.map((test) => {
			return executeOne(test, options)
		}),
	)
}
