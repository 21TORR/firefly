const {Firefly} = require("../../../src/Firefly");

module.exports = (new Firefly())
	.scss({
		test: "assets/test.scss",
	})
	.disableFileNameHashing();
