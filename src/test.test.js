const path = require("path")
const { list } = require("./test.js")

list(path.resolve(__dirname, "../")).then(console.log, console.error)
