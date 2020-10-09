const {Firefly} = require("../../../src/Firefly");

module.exports = (new Firefly())
	.js({
		test: "assets/test.ts",
	})
	.scss({
		test: "assets/test.scss",
	});
