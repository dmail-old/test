import { createSuite } from "./index.js"
import { test as testCheap } from "@dmail/test-cheap"
import assert from "assert"
import { mockExecution } from "micmac"

const createPromiseAndHooks = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return {
    promise,
    resolve,
    reject,
  }
}

testCheap("run", ({ ensure }) => {
  ensure("run one test basics", () => {
    mockExecution(({ tick }) => {
      const { resolve, promise } = createPromiseAndHooks()
      const suite = createSuite(({ test }) => {
        test(() => promise)
      })
      let results
      suite.output.then((value) => {
        results = value
      })
      assert.equal(results, undefined)

      tick(10)
      resolve("hello")
      tick(5)
      assert.deepEqual(results, [
        {
          cancelled: false,
          description: results[0].description,
          endMs: 15,
          exclusive: false,
          expired: false,
          passed: true,
          skipped: false,
          startMs: 10,
          stopped: false,
          value: "hello",
        },
      ])
    })
  })

  // ensure("executeOne implementation failed", () => {
  //   const value = 1
  //   const theTest = test(() => failed(value))
  //   const testExecution = executeOne(theTest)

  //   assert.equal(testExecution.isFailed(), true)
  //   const result = testExecution.getResult()
  //   assert.deepEqual(result.passed, false)
  //   assert.deepEqual(result.value, value)
  // })

  // ensure("executeOne implementation taking too much time to pass", () => {
  //   const clock = install()

  //   const allocatedMs = 10
  //   const requiredMs = 100
  //   const theTest = test(() => {
  //     const action = createAction()
  //     setTimeout(action.pass, requiredMs)
  //     return action
  //   })

  //   const testExecution = executeOne(theTest, { allocatedMs })

  //   assert.equal(testExecution.getState(), "unknown")
  //   clock.tick(allocatedMs)
  //   assert.equal(testExecution.getState(), "failed")
  //   assert.deepEqual(testExecution.getResult().expired, true)
  //   assert.doesNotThrow(() => clock.tick(requiredMs))

  //   clock.uninstall()
  // })

  // ensure("executeMany run scenario in serie", () => {
  //   // const firstAction = createAction()
  //   // const secondAction = createAction()
  //   // const firstSpy = createSpy(() => firstAction)
  //   // const secondSpy = createSpy(() => secondAction)
  //   // const { run } = createSuite(createTest("first", firstSpy), createTest("second", secondSpy))
  //   // run()
  //   // assert.equal(firstSpy.getReport(0).called, true)
  //   // assert.equal(secondSpy.getReport(0).called, false)
  //   // firstAction.pass()
  //   // assert.equal(secondSpy.getReport(0).called, true)
  // })

  // ensure("executeMany collect failures", () => {
  //   const clock = install()

  //   const nowMs = Date.now()
  //   const firstValue = 1
  //   const secondValue = 2
  //   const firstTest = test(() => failed(firstValue))
  //   const secondTest = test(() => failed(secondValue))
  //   const execution = executeMany([firstTest, secondTest])

  //   assert.deepEqual(execution.getResult(), [
  //     {
  //       description: firstTest.description,
  //       focused: false,
  //       skipped: false,
  //       expired: false,
  //       startMs: nowMs,
  //       endMs: nowMs,
  //       passed: false,
  //       value: firstValue,
  //     },
  //     {
  //       description: secondTest.description,
  //       focused: false,
  //       skipped: false,
  //       expired: false,
  //       startMs: nowMs,
  //       endMs: nowMs,
  //       passed: false,
  //       value: secondValue,
  //     },
  //   ])

  //   clock.uninstall()
  // })
})
