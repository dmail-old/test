```javascript
import { plan } from "@dmail/test"

export const template = plan.focus("feature a", ({ test, scenario }) => {
	test("foo")

	scenario("nested plan", () => {
		scenario.focus("further nested plan", () => {
			test.focus("zzz", () => {})

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
