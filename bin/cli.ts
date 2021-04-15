#!/usr/bin/env node

import sade = require("sade");
import {cyan, bgCyan} from "kleur";
import {runFirefly} from "../src/run";
import {runInit} from '../src/run-init';

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
        taskHeadline("Dev");

        runFirefly({
            watch: true,
            verbose: opts.verbose,
            debug: true,
            fix: false,
        });
    });


program
    .command("build", "", {default: true})
    .describe("Builds a debug build, lints the assets, fixes the code style and exits with an appropriate exit code (use this for you CI or for development)")
    .action(opts =>
    {
        taskHeadline("Build");

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
        taskHeadline("CI");

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
        taskHeadline("Release");

        runFirefly({
            watch: false,
            verbose: opts.verbose,
            debug: false,
            fix: false,
        });
    });


program
    .command("init")
    .describe("Initializes the config")
    .option('--force', 'Initializes the config, even if the files already exist')
    .action(opts =>
    {
        taskHeadline("Init");

        runInit(process.cwd(), !!opts.force);
    });

program.parse(process.argv);



/**
 * Logs a task headline
 */
export function taskHeadline (headline: string) : void
{
    headline = ` ${headline.toUpperCase()} `;
    console.log(`    ${bgCyan().black(headline)}`);
    console.log("");
}
