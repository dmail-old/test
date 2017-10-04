const isAction = value => value && typeof value.then === "function"

const createAction = () => {
	let state = "unknown"
	let result

	const action = {}
	const isPassing = () => state === "passing"
	const isFailing = () => state === "failing"
	const isPassed = () => state === "passed"
	const isFailed = () => state === "failed"
	const isRunning = () => state === "unknown" || isPassing() || isFailing()
	const isEnded = () => isPassed() || isFailed()
	const pendingActions = []

	const runPendingActions = () => {
		pendingActions.forEach(pendingAction => {
			pendingAction.fn(action, result)
		})
		pendingActions.length = 0
	}
	const handleResult = (value, passing) => {
		if (passing) {
			state = "passing"
			if (isAction(value)) {
				if (result === action) {
					throw new TypeError("an action cannot pass with itself")
				}
				value.then(
					value => {
						if (isRunning()) {
							handleResult(value, true)
						}
					},
					value => {
						if (isRunning()) {
							handleResult(value, false)
						}
					}
				)
			} else {
				state = "passed"
				result = value
				runPendingActions()
			}
		} else {
			state = "failed"
			result = value
			runPendingActions()
		}
	}
	const fail = value => {
		if (isFailed() || isFailing()) {
			throw new Error(`fail must be called once`)
		}
		if (isPassed()) {
			throw new Error(`fail must not be called after pass was called`)
		}
		handleResult(value, false)
	}
	const pass = value => {
		if (isPassing() || isPassed()) {
			throw new Error(`pass must be called once`)
		}
		if (isFailed()) {
			throw new Error(`pass must not be called after fail was called`)
		}
		handleResult(value, true)
	}
	const then = (onPassed, onFailed) => {
		const nextAction = createAction()
		const nextActionHandler = () => {
			let nextActionResult = result

			if (isFailed()) {
				if (onFailed) {
					nextActionResult = onFailed(result)
				}
				nextAction.fail(nextActionResult)
			} else {
				if (onPassed) {
					nextActionResult = onPassed(result)
				}
				nextAction.pass(nextActionResult)
			}
		}
		if (isRunning()) {
			pendingActions.push({
				fn: nextActionHandler
			})
		} else {
			nextActionHandler()
		}

		return nextAction
	}
	const getState = () => state
	const getResult = () => result

	Object.assign(action, {
		getState,
		getResult,
		isPassing,
		isFailing,
		isPassed,
		isFailed,
		isRunning,
		isEnded,
		pass,
		fail,
		then
	})

	return action
}
exports.createAction = createAction

const fromFunction = fn => {
	const action = createAction()
	const returnValue = fn(action)
	if (isAction(returnValue)) {
		returnValue.then(action.pass, action.fail)
	}
	return action
}
exports.fromFunction = fromFunction

const passed = value => fromFunction(({ pass }) => pass(value))
exports.passed = passed

const failed = value => fromFunction(({ fail }) => fail(value))
exports.failed = failed

const all = iterable =>
	fromFunction(({ fail, pass }) => {
		let callCount = 0
		let passedCount = 0
		const results = []

		const compositeOnPassed = (result, index) => {
			results[index] = result
			passedCount++
			if (passedCount === callCount) {
				pass(results)
			}
		}
		const run = (value, index) => {
			if (isAction(value)) {
				value.then(result => compositeOnPassed(result, index), fail)
			} else {
				compositeOnPassed(value, index)
			}
		}

		let index = 0
		for (const value of iterable) {
			run(value, index)
			callCount++
			index++
		}

		if (passedCount === callCount) {
			pass(results)
		}
	})
exports.all = all
// all(["foo", "bar"]).then(console.log)

const sequence = (iterable, fn = v => v) =>
	fromFunction(({ pass, fail }) => {
		const iterator = iterable[Symbol.iterator]()
		const results = []

		const iterate = () => {
			const { done, value } = iterator.next()
			if (done) {
				return pass(results)
			}
			const valueModified = fn(value)
			if (isAction(valueModified)) {
				valueModified.then(
					result => {
						results.push(result)
						iterate()
					},
					result => {
						fail(result)
					}
				)
			} else {
				results.push(valueModified)
				iterate()
			}
		}
		iterate()
	})
exports.sequence = sequence
// sequence(["a", "b"]).then(console.log)

const any = iterable =>
	fromFunction(({ fail, pass }) => {
		let running = true
		const compositePass = value => {
			if (running) {
				running = false
				pass(value)
			}
		}
		const compositeFail = value => {
			if (running) {
				running = false
				fail(value)
			}
		}

		for (const value of iterable) {
			if (isAction(value)) {
				value.then(compositePass, compositeFail)
			} else {
				compositePass(value)
			}

			if (running === false) {
				break
			}
		}
	})
exports.any = any

const aroundAction = (before, actionCreator, after) => {
	before()
	return actionCreator().then(
		result => {
			after(result, true)
			return result
		},
		result => {
			after(result, true)
			return result
		}
	)
}
exports.aroundAction = aroundAction

const fromPromise = promise =>
	fromFunction(({ pass, fail }) => {
		promise.then(value => setTimeout(pass, 0, value), reason => setTimeout(fail, 1, reason))
	})
exports.fromPromise = fromPromise

const fromNodeCallback = fn => (...args) =>
	fromFunction(({ pass }) => {
		fn(...args, (error, data) => {
			if (error) {
				throw error
			} else {
				pass(data)
			}
		})
	})
exports.fromNodeCallback = fromNodeCallback

const fromNodeCallbackRecoveringWhen = (fn, recoverWhen, recoverValue) => (...args) =>
	fromFunction(({ pass }) => {
		fn(...args, (error, data) => {
			if (error) {
				if (recoverWhen(error)) {
					pass(recoverValue)
				} else {
					throw error
				}
			} else {
				pass(data)
			}
		})
	})
exports.fromNodeCallbackRecoveringWhen = fromNodeCallbackRecoveringWhen

// passed("foo").then(console.log)

// const fs = require("fs")
// const path = require("path")

// const readFile = path =>
// 	createAction(({ pass }) =>
// 		fs.readFile(path, (error, buffer) => {
// 			if (error) {
// 				throw error
// 			}
// 			pass(buffer)
// 		})
// 	)
// const readFileAsString = path => readFile(path).chain(String)
// readFileAsString(path.resolve(__dirname, "./test.js")).then(console.log)
