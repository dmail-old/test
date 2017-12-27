```javascript
import { createTestRunner, test } from "@dmail/test"
import { aFunctionWhich, whenCalledWith, willReturnWith } from "@dmail/expect"
import { passed } from "@dmail/action"

export const run = createTestRunner(
	test("always pass", () => passed()),
	test("call with null", () => {
		return aFunctionWhich(whenCalledWith(null), willReturnWith(null))(fn)
	}),
	test("call with undefined", () => {
		return aFunctionWhich(whenCalledWith(undefined), willReturnWith(undefined))(fn)
	}),
	test.force("only me because debugging this one", () => {}),
	test.force("and me too please", () => {}),
)
```
