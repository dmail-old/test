const path = require("path")
const { list } = require("./test.js")

list(path.resolve(__dirname, "../"))

console.log("test tests passed")
