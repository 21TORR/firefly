const {Firefly} = require("../../../src/Firefly");

module.exports = (new Firefly())
	.js({
		test: "assets/test.js",
	})
	.scss({
		test: "assets/test.scss",
	});
