import { createBrowserLogger } from "./logger.js"

export const isAssertionError = () => false

export const createAssertionError = () => {}

const createTest = ({ fn, fileName, lineNumber, columnNumber, exclusive, skipped }) => {
  const test = {}

  const isExclusive = () => exclusive

  const isSkipped = () => skipped

  // const dirname = path.relative(process.cwd(), fileName)
  // https://github.com/Microsoft/vscode/issues/27713
  // we also have to sourcemap the fileName, lineNumber & columnNumber
  const description = `${fileName}:${lineNumber}:${columnNumber}`

  Object.assign(test, {
    description,
    fn,
    isExclusive,
    isSkipped,
  })

  return Object.freeze(test)
}

// https://github.com/v8/v8/wiki/Stack-Trace-API
const getExternalCallerCallSite = () => {
  const { prepareStackTrace } = Error
  let callSites
  let callSite

  try {
    const error = new Error()

    Error.prepareStackTrace = (error, stack) => stack

    callSites = error.stack
    const currentFileName = callSites[0].getFileName()

    callSite = callSites.slice(1).find((callStack) => {
      return callStack.getFileName() !== currentFileName
    })
  } catch (e) {}

  Error.prepareStackTrace = prepareStackTrace

  return callSite
}

const collect = (suiteFn) => {
  const tests = []

  const test = (fn, { exclusive = false, skipped = false } = {}) => {
    // https://github.com/stefanpenner/get-caller-file
    const callSite = getExternalCallerCallSite()
    const fileName = callSite.getFileName()
    const lineNumber = callSite.getLineNumber()
    const columnNumber = callSite.getColumnNumber()

    const test = createTest({
      fn,
      fileName,
      lineNumber,
      columnNumber,
      exclusive,
      skipped,
    })

    tests.push(test)

    return test
  }
  test.only = (fn) => test(fn, { exclusive: true })
  test.skip = (fn) => test(fn, { skipped: true })

  suiteFn({ test })

  const someTestIsExclusive = tests.some(({ isExclusive }) => isExclusive())
  if (someTestIsExclusive) {
    return tests.filter((test) => test.isExclusive())
  }
  return tests
}

const defaultOptions = {
  allocatedMs: Infinity,
}

export const createSuite = (suiteFn, { autoRun = true, ...suiteOptions } = {}) => {
  const run = (runOptions) => {
    const { allocatedMs } = { ...defaultOptions, ...suiteOptions, ...runOptions }

    const tests = collect(suiteFn)
    const { beforeAll, beforeEach, afterEach, afterAll } = createBrowserLogger()
    const results = []

    beforeAll({ tests })

    let currentTestExecution
    let suiteExecutionStopped = false

    const createTestPromise = ({ fn, skipped, cleanup }) => {
      if (skipped) {
        return Promise.resolve(() => ({ status: "skipped" }))
      }
      if (suiteExecutionStopped) {
        return Promise.resolve(() => ({ status: "cancelled" }))
      }
      return Promise.resolve()
        .then(() => fn({ cleanup }))
        .then(
          (value) => ({ status: "passed", value }),
          (reason) => {
            if (isAssertionError(reason)) {
              return { status: "failed", value: reason }
            }
            return Promise.reject(reason)
          },
        )
    }

    const executeOne = ({ fn, skipped }) => {
      // the test may register a cleanup callback to remove stuff once done
      let cleanupCallback = () => {}
      const cleanup = (callback) => {
        cleanupCallback = callback
      }

      let timeout
      const timeoutPromise = new Promise((resolve) => {
        timeout = setTimeout(resolve, allocatedMs)
      }).then(() => ({ status: "expired" }))

      let resolveStop
      const stopPromise = new Promise((resolve) => {
        resolveStop = resolve
      }).then(() => ({ status: "stopped" }))
      const stop = () => {
        resolveStop()
      }

      const testPromise = createTestPromise({ fn, skipped, cleanup })

      const promise = Promise.race([stopPromise, timeoutPromise, testPromise]).then(
        ({ status, value }) => {
          clearTimeout(timeout)
          cleanupCallback()

          const result = {
            skipped: status === "skipped",
            stopped: status === "stopped",
            cancelled: status === "cancelled",
            expired: status === "expired",
            passed: status === "passed",
            value,
          }

          return result
        },
      )

      promise.stop = stop

      return promise
    }

    // test are runned in serie to ensure console.log output is predictable
    // this way if a test logs or throw we know where it comes from
    // we could consider that if a test throw stack trace is enough to know which test failed
    // and logs are bad practice or could be mocked during test execution to capture logs
    // for now we keep it simple
    const promise = tests
      .reduce((previous, test) => {
        return previous.then(() => {
          const description = test.description
          const startMs = Date.now()
          const skipped = test.isSkipped()
          const exclusive = test.isExclusive()

          beforeEach({ description, skipped, exclusive, startMs })
          currentTestExecution = executeOne(test)
          return currentTestExecution.then(
            ({ skipped, stopped, cancelled, expired, passed, value }) => {
              const endMs = Date.now()
              const result = {
                description,
                exclusive,
                startMs,
                endMs,
                skipped,
                stopped,
                cancelled,
                expired,
                passed,
                value,
              }
              afterEach(result)
              results.push(result)
              return result
            },
          )
        })
      }, Promise.resolve())
      .then(() => {
        afterAll(results)
        return results
      })

    const stop = () => {
      suiteExecutionStopped = true
      if (currentTestExecution) {
        currentTestExecution.stop()
      }
    }

    promise.stop = stop

    return promise
  }

  return {
    run,
    output: autoRun ? run() : null,
  }
}
