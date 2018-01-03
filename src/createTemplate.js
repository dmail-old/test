/*

comment faire pour obtenir ce qu'on veut c'est à dire:

tests: [
	{isSkipped, isForced, run},
	...
]

sachant que si un scenario exporté par un fichier est force alors il exclue les autres
et que s'il est skip il skip tout les tests à l'intérieur

c'est assez simple je suppose
en fait scenario(), plan() et test() sont juste des helpers
pour collecter des tests

un test reste un object à part entière séparé de tout ça
et à la fin on a une seule méthode: run(tests, {before, beforeEach, afterEach, after, allocatedMs})

donc en amont on a rien de spécial, juste des objets tout bêtes
et la méthode run détient toute la logique

on utilisera une autre méthode: collect(scenario)
qui retourns un tableau de tests
et lorsqu'on utilise plusieur fichiers on concat tout ça en tenant compte de forced et skipped

*/

import { createFactory, pure, mixin } from "@dmail/mixin"
import {
	passed,
	createAction,
	allocableMsTalent,
	createActionWithAllocableMs,
	compose,
	createIterator,
} from "@dmail/action"

export const compileOne = (
	{ description, isForced, isSkipped },
	{ before = () => {}, after = () => {}, allocatedMs = Infinity, compiler, ...props } = {},
) => {
	const startMs = Date.now()
	before({ description, forced: isForced(), skipped: isSkipped(), startMs })

	const action = mixin(createAction(), allocableMsTalent)
	const expirationToken = action.allocateMs(allocatedMs)

	if (isSkipped()) {
		action.pass()
	} else {
		action.pass(
			compiler({
				startMs,
				allocatedMs,
				...props,
			}),
		)
	}

	const end = (value, passed) => {
		const endMs = Date.now()
		const result = {
			description,
			forced: isForced(),
			skipped: isSkipped(),
			startMs,
			endMs,
			expired: value === expirationToken,
			passed,
			value,
		}
		after(result)
		return result
	}

	return action.then((value) => end(value, true), (value) => end(value, false))
}

export const compileMany = (
	parsedTemplates,
	{ allocatedMs = Infinity, beforeEach = () => {}, afterEach = () => {}, ...props },
) => {
	const someIsForced = parsedTemplates.some(({ isForced }) => isForced())
	const values = []
	let someHasFailed = false

	const from = createActionWithAllocableMs(allocatedMs)
	let currentExpirationToken = from.allocateMs(allocatedMs)
	from.pass()

	return compose({
		from,
		iterator: createIterator(parsedTemplates),
		composer: ({ action, value, state, index, nextValue, done, fail, pass }) => {
			if (index > -1) {
				// I should also measure duration before action pass/fail
				values.push(value)
			}
			if (state === "failed") {
				if (value === currentExpirationToken) {
					// fail saying we are out of 10ms
					// even if the action may say it failed because it had only 8ms
					// because the composedAction has 10ms
					// even if its subaction may have less
					return fail(currentExpirationToken.toString())
				}
				someHasFailed = true
			}
			if (done) {
				if (someHasFailed) {
					return fail(values)
				}
				return pass(values)
			}

			const parsedTemplate = nextValue
			if (someIsForced && parsedTemplate.isForced() === false) {
				parsedTemplate.skip()
			}

			const nextAction = createActionWithAllocableMs()
			currentExpirationToken = nextAction.allocateMs(action.getRemainingMs())
			nextAction.pass(
				compileOne(parsedTemplate, { before: beforeEach, after: afterEach, ...props }),
			)

			return nextAction
		},
	})
}

export const createTemplate = createFactory(pure, ({ description, parser, getLastComposite }) => {
	let forced = false

	const isForced = () => forced

	const force = () => {
		forced = true
	}

	let skipped = false

	const isSkipped = () => skipped

	const skip = () => {
		skipped = true
	}

	const parse = () => passed(parser(getLastComposite()))

	const execute = (param) => parse().then(({ parsed, compile }) => compile(parsed, param))

	return { description, force, skip, isForced, isSkipped, parse, execute }
})
