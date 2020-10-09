import test from "ava";
import {runFixture} from "./lib/fixture-helper";
import {join} from "path";
import {existsSync} from "fs-extra";

test("Run fixture: lint-issues", async t => {
	await runFixture("lint-issues", (result, path) =>
	{
		t.is(result.exitCode, 1, "failed build");
		t.regex(result.stdout, /Build failed after/, "global status is 'failed'");
		t.regex(result.stdout, /SCSS Found linting issues/, "SCSS lint issues found");
		t.regex(result.stdout, /JS Found linting issues/, "JS lint issues found");
		t.regex(result.stdout, /\(SCSS failed, JS failed\)/, "Both sub tasks failed");

		t.true(existsSync(join(path, "build/js/legacy/test.js")), "JS legacy build file exists");
		t.true(existsSync(join(path, "build/js/modern/test.js")), "JS modern build file exists");
		t.true(existsSync(join(path, "build/css/test.css")), "CSS build file exists");
	});
});
