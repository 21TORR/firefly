import test from "ava";
import {runFixture} from "./lib/fixture-helper";
import {existsSync} from "fs-extra";
import {join} from "path";

test("Run fixture: basic", async t => {
	await runFixture("basic", (result, path) =>
	{
		t.is(result.exitCode, 0);
		t.regex(result.stdout, /Build succeeded after/);
		t.notRegex(result.stdout, /SCSS Found linting issues/, "no SCSS lint issues found");
		t.notRegex(result.stdout, /JS Found linting issues/, "no JS lint issues found");
		t.regex(result.stdout, /SCSS succeeded/, "SCSS sub tasks succeeded");
		t.regex(result.stdout, /JS succeeded/, "JS sub tasks succeeded");

		t.true(existsSync(join(path, "build/js/legacy/test.js")), "JS legacy build file exists");
		t.true(existsSync(join(path, "build/js/modern/test.js")), "JS modern build file exists");
		t.true(existsSync(join(path, "build/css/test.css")), "CSS build file exists");
	});
});
