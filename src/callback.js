/*

ok à quoi ressemblerai l'api ?

en gros je veux faire un truc et lorsqu'il est fini faure autre chose
il serais aussi possible de faire .all, .race .sequence

callback(
  ({fail, complete} => {
    fs.readFile((error, data) => error ? fail(error) : complete())
  }
)

chaque callback pourrais être .all

*/

const signal = {}

const callback = executor => {
	const failed = signal({ memorize: true })
	const completed = signal({ memorize: true })

	const fail = value => {
		failed.emit(value)
	}
	const complete = value => {
		completed.emit(value)
	}
	setTimeout(() => {
		executor({ fail, complete })
	})

	const chain = fn => {
		completed.listenOnce(value => callback(fn(value)))
	}
	const chainFailed = fn => {
		failed.listenOnce(() => callback(fn))
	}
	const sequence = () => {}
	const always = fn => {
		completed.listenOnce(value => fn(value))
		failed.listenOnce(value => fn(value))
	}

	return {
		chain,
		chainFailed,
		sequence,
		always
	}
}
exports.callback = callback
