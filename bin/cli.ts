#!/usr/bin/env node

import sade = require("sade");
import {cyan} from "kleur";
import {runFirefly} from "../src/run";

console.log(``);
console.log(cyan(`  ╭───────────────────╮`));
console.log(cyan(`  │                   │`));
console.log(cyan(`  │    🚀  ${cyan("Firefly")}    │`));
console.log(cyan(`  │                   │`));
console.log(cyan(`  ╰───────────────────╯`));
console.log(``);

const program = sade("firefly");


program
    .version("0.0.1")
    .option('--verbose', 'show all errors in the builder / config file with stack trace');


program
    .command("dev")
    .describe("Starts a watcher, builds debug builds, fixes + lints. Use this for development.")
    .action(opts =>
    {
        runFirefly({
            watch: true,
            verbose: opts.verbose,
            debug: true,
            fix: true,
        });
    });


program
    .command("build", "", {default: true})
    .describe("Builds a debug build, lints the assets, fixes the code style and exits with an appropriate exit code (use this for you CI or for development)")
    .action(opts =>
    {
        runFirefly({
            watch: false,
            verbose: opts.verbose,
            debug: true,
            fix: true,
        });
    });


program
    .command("ci")
    .describe("Builds a CI build, lints the assets and exits with an appropriate exit code (use this for you CI or for development)")
    .action(opts =>
    {
        runFirefly({
            watch: false,
            verbose: opts.verbose,
            debug: true,
            fix: false,
        });
    });


program
    .command("release")
    .describe("Builds the project for release / production.")
    .action(opts =>
    {
        runFirefly({
            watch: false,
            verbose: opts.verbose,
            debug: false,
            fix: false,
        });
    });

program.parse(process.argv);
