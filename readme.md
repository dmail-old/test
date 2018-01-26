# Test

[![npm](https://badge.fury.io/js/%40dmail%2Ftest.svg)](https://badge.fury.io/js/%40dmail%2Ftest)
[![build](https://travis-ci.org/dmail/test.svg?branch=master)](http://travis-ci.org/dmail/test)
[![codecov](https://codecov.io/gh/dmail/test/branch/master/graph/badge.svg)](https://codecov.io/gh/dmail/test)

Nodejs test runner

```javascript
import { test } from "@dmail/test"
import assert from "assert"

test(() => {
	assert.equal(0, 0)
})

test(() => {
	assert.equal(1, 1)
})
```
