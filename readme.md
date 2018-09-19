# Test

[![npm](https://badge.fury.io/js/%40dmail%2Ftest.svg)](https://badge.fury.io/js/%40dmail%2Ftest)
[![build](https://travis-ci.org/dmail/test.svg?branch=master)](http://travis-ci.org/dmail/test)
[![codecov](https://codecov.io/gh/dmail/test/branch/master/graph/badge.svg)](https://codecov.io/gh/dmail/test)

Test runner

```javascript
import { createSuite } from "@dmail/test"
import assert from "assert"

const suite = createSuite(({ test }) => {
  test(() => {
    assert.equal(0, 0)
  })

  test(() => {
    assert.equal(1, 1)
  })
})

// le fait qu'on puisse recup l'output c'est cool mais relou aussi parce au'il faut l'ecrire a chaque fois
// ca serais mieux si on arrivait a lr ecup grace aux logs ou un truc comme ca
export const output = suite.output
```
