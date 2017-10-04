const assert = require("assert")
const { fromNodeCallback, fromNodeCallbackRecoveringWhen, passed } = require("./action.js")

const assertPassed = action => assert.equal(action.getState(), "passed")
const assertResult = (action, expectedResult) => assert.equal(action.getResult(), expectedResult)

{
	console.log("fromNodeCallback with sucessfull callback")
	const nodeCallbackSuccess = (value, callback) => callback(null, value)
	const value = 1
	const action = fromNodeCallback(nodeCallbackSuccess)(value)
	assertPassed(action)
	assertResult(action, value)
}
{
	console.log("fromNodeCallback with errored callback")
	const nodeCallbackError = (error, callback) => callback(error)
	const exception = 1
	assert.throws(() => {
		fromNodeCallback(nodeCallbackError)(exception)
	}, error => error === exception)

	console.log("fromNodeCallbackRecoveringWhen with recovered errored callback")
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
{
	console.log("with thenable")
	const passedValue = 1
	const thenable = {
		then: onPassed => onPassed(passedValue)
	}
	const action = passed(thenable)
	assertPassed(action)
	assertResult(action, passedValue)
}

console.log("action tests passed")
