# Test

[![npm](https://badge.fury.io/js/%40dmail%2Ftest.svg)](https://badge.fury.io/js/%40dmail%2Ftest)
[![build](https://travis-ci.org/dmail/test.svg?branch=master)](http://travis-ci.org/dmail/test)
[![codecov](https://codecov.io/gh/dmail/test/branch/master/graph/badge.svg)](https://codecov.io/gh/dmail/test)

Nodejs test runner

```javascript
import { scenario } from "@dmail/scenario"

export const unit = scenario("feature", ({ test, plan }) => {
	plan("subfeature", () => {
		test("foo", () => {})

		plan("other plan", () => {
			test("bar", () => {})
		})
	})
})
```
