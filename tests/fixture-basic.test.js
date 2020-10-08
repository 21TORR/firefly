import test from "ava";
import {runFixture} from "./lib/fixture-helper";

test("Run fixture: basic", async t => {
	await runFixture("basic", (result, path) =>
	{
		t.is(result.exitCode, 0);
		t.regex(result.stdout, /Build succeeded after/);
	});
});
