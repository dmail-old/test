import { createTemplate, compileOne } from "./createTemplate.js"

export const createTest = ({ description, fn }) => {
	return createTemplate({
		description,
		parse: (tpl) => {
			return {
				parsed: tpl,
				compile: (param) => compileOne(tpl, { compiler: fn, ...param }),
			}
		},
	})
}
