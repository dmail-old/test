/*

import { plan, test } from "@dmail/test"

export const task = plan("feature a", () => {
  plan("nested plan", () => {
    plan("further nested plan", () => {
      test("", () => {

      })
    })
  })

  test("first test", () => {})

  test("second test", () => {})
})

import { plan } from "@dmail/test"

export const unit = plan(
  "feature a",
  ({ test, plan }) => {
    plan("other plan", ({ test, plan }) => {
      test("yo", () => {})
    })

    test("something", () => {})
    test("something else", () => {})
  }
})

// niveau logs on auras quelque chose comme:

feature a other plan yo:
feature a something:
feature a something else:

import { plan } from "@dmail/test"

export const unit = plan(
  "feature a"
  plan("other plan", test("yo", () => {})),
  test("something", () => {}),
  test("something else", () => {})
)

*/

// we are running tests in sequence and not in parallel because they are likely going to fail
// when they fail we want the failure to be reproductible, if they run in parallel we introduce
// race condition, non determinism, etc: bad idea

export * from "./src/createPlan.js"
export * from "./src/findFiles.js"
