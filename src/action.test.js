const assert = require("assert")
const { fromNodeCallback, fromNodeCallbackRecoveringWhen } = require("./action.js")

const assertPassed = action => assert.equal(action.getState(), "passed")
const assertResult = (action, expectedResult) => assert.equal(action.getResult(), expectedResult)

{
	const nodeCallbackSuccess = (value, callback) => callback(null, value)
	const value = 1
	const action = fromNodeCallback(nodeCallbackSuccess)(value)
	assertPassed(action)
	assertResult(action, value)
}
{
	const nodeCallbackError = (error, callback) => callback(error)
	const exception = 1
	assert.throws(() => {
		fromNodeCallback(nodeCallbackError)(exception)
	}, error => error === exception)

	const recoveredException = 2
	const recoverValue = 3
	const action = fromNodeCallbackRecoveringWhen(
		nodeCallbackError,
		error => error === recoveredException,
		recoverValue
	)(recoveredException)
	assertPassed(action)
	assertResult(action, recoverValue)
}
