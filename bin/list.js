const { list } = require("../index.js")

const cwd = process.cwd()

list(cwd).then(
	files => {
		console.log(`${files.length} test files in ${cwd}`)
		if (files.length > 0) {
			console.log(files.join("\n"))
		}
		process.exit(0)
	},
	error => {
		setTimeout(() => {
			throw error
		})
	}
)
