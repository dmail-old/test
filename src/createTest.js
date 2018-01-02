import { createTemplate } from "./createTemplate.js"

export const createTest = ({ description, fn }) => {
	return createTemplate({
		description,
		implementation: fn,
	})
}
