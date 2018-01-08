const config = require("@dmail/shared-config").config("babel", {
	plugins: ["transform-object-rest-spread"],
	only: ["bin/*"],
})
module.exports = config
