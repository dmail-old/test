```javascript
import { plan } from "@dmail/test"

const fn = (value) => {
	return {
		value
	}
}

export const template = plan.focus("feature a", ({ test, scenario }) => {
	scenario(() => {
		const input = 10
		const output = fn(10)
		return {input, output}
	}), () => {
		test(({input}) => input === 10, "input must be 10")

		test(({output}) => output.hasOwnProperty('value'), "output must have a value property")

		scenario(({output}) => {
			return output.value
		}, () => {
			test((value) => value === 10)
		})
	})
})
```

* test.force, plan.force, scenario.force, means all other non forced test/plan/scenario must be skipped
* skip will prevent test/plan/scenario from being runned, (anything inside as well)
* scenario must be discoverable: we can access tests count, skipped count, forced count
