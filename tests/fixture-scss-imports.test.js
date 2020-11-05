import test from "ava";
import {runFixture} from "./lib/fixture-helper";
import {existsSync} from "fs-extra";
import {join} from "path";

test("Run fixture: scss-imports", async t => {
	await runFixture("scss-imports", (result, path) =>
	{
		t.is(result.exitCode, 0);
		t.regex(result.stdout, /Build succeeded after/);
		t.notRegex(result.stdout, /SCSS Found linting issues/, "no SCSS lint issues found");
		t.regex(result.stdout, /SCSS succeeded/, "SCSS sub tasks succeeded");

		t.true(existsSync(join(path, "build/css/test.css")), "CSS build file exists");
	});
});
