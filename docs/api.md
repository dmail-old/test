```javascript
import { scenario } from "@dmail/test"

export const template = scenario.force("feature a", ({ test, plan }) => {
	test("foo")

	plan("nested plan", () => {
		plan.force("further nested plan", () => {
			test.force("zzz", () => {})

			test.skip("stuff", () => {})
		})
	})

	test("bat", () => {})

	test("bar", () => {})
})
```

* test.force, plan.force, scenario.force, means all other non forced test/plan/scenario must be skipped
* skip will prevent test/plan/scenario from being runned, (anything inside as well)
* scenario must be discoverable: we can access tests count, skipped count, forced count
