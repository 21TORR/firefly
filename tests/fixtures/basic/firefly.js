const {Firefly} = require("../../../src/Firefly");

module.exports = (new Firefly())
	.js({
		test_js: "assets/test.js",
	})
	.scss({
		test: "assets/test.scss",
	});
