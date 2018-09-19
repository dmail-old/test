import {
  exclusiveIcon,
  passedIcon,
  failedIcon,
  passedColor,
  failedColor,
  skippedColor,
  expiredIcon,
  expiredColor,
  endColor,
} from "./styles.js"
import { getResultStats } from "./util.js"

const appendResult = (string, value) => {
  if (value) {
    return `${string} with ${value}`
  }
  return string
}

export const createBrowserLogger = () => {
  const beforeAll = () => {
    console.log(`executing tests`)
  }

  // because runned in parallel we may not want to log before a test execution because
  // logs would be barely readable
  const beforeEach = ({ skipped, cancelled, exclusive, description }) => {
    if (skipped || cancelled) {
      return
    }
    console.log("")
    console.log(exclusive ? `${exclusiveIcon} ${description}` : description)
  }

  const afterEach = ({ skipped, stopped, cancelled, passed, expired, value }) => {
    if (skipped) {
      // console.log(appendResult(`${skippedColor}${skippedIcon} skipped${endColor}`, value))
    } else if (stopped) {
      console.log("stopped")
    } else if (cancelled) {
      // nothing
    } else if (expired) {
      console.log(appendResult(`${expiredColor}${expiredIcon} expired${endColor}`, value))
    } else if (passed) {
      console.log(appendResult(`${passedColor}${passedIcon} passed${endColor}`, value))
    } else {
      console.log(appendResult(`${failedColor}${failedIcon} failed${endColor}`, value))
    }
  }

  const afterAll = (results) => {
    const { totalCount, passedCount, failedCount, skippedCount } = getResultStats(results)

    const categories = []
    categories.push(`${passedColor}${passedCount} passed${endColor}`)
    categories.push(`${failedColor}${failedCount} failed${endColor}`)
    categories.push(`${skippedColor}${skippedCount} skipped${endColor}`)

    console.log("")
    console.log(`${totalCount} tests: ${categories.join(", ")}`)
  }

  return { beforeAll, beforeEach, afterEach, afterAll }
}
