import test from "ava";
import {runFixture} from "./lib/fixture-helper";

test("Run fixture: typescript", async t => {
	await runFixture("typescript", (result, path) =>
	{
		t.is(result.exitCode, 0);
		t.regex(result.stdout, /Build succeeded after/);
	});
});
