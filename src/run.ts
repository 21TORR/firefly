import {bgRed, blue, gray, green, red, cyan} from "kleur";
import {FireflyTypes} from "./@types/firefly";
import {Logger} from "./lib/Logger";
import {Firefly} from "./Firefly";
import {ScssBuilder} from "./builder/ScssBuilder";
import {JsBuilder} from "./builder/JsBuilder";


/**
 * Completely aborts the execution and prints an error message.
 */
function abortWithError (message: string) : never
{
	console.log("");
	console.log(`  ${bgRed().white("ERROR")}`);
	console.log("");
	console.log(`  ${message}`);
	console.log("");
	console.log(gray("Aborting."));
	process.exit(2);
}

/**
 * Runs the main firefly
 */
export function runFirefly (config: FireflyTypes.RunConfig) : void
{
	const logger = new Logger(cyan("Firefly"));
	logger.log("Build started");
	const start = process.hrtime();

	try
	{
		const instance = require(`${process.cwd()}/firefly.js`);

		if (!(instance instanceof Firefly))
		{
			abortWithError("Invalid return value. Must be instance of `Firefly`.");
		}

		const scss = new ScssBuilder(logger, config, instance.generateScssBuildConfig(config));
		const js = new JsBuilder(config, instance.generateJsBuildConfig(config));

		Promise.all([scss.run(), js.run()])
			.then(([scssResult, jsResult]: [boolean, boolean]) =>
			{
				// if we are exiting a watcher, just return neutral
				if (config.watch)
				{
					logger.logWithDuration(`Ended watching`, process.hrtime(start));
					process.exit(0);
				}

				const failed = !scssResult || !jsResult;
				const status = failed
					? red("failed")
					: green("succeeded");
				logger.logWithDuration(`Build ${status}`, process.hrtime(start));
				process.exit(failed ? 1 : 0);
			})
			.catch((...args) => {
				console.log("Running the build failed", args);
				process.exit(3);
			});


		if (config.watch)
		{
			let alreadyExited = false;
			const exitCallback = (event) =>
			{
				if (alreadyExited)
				{
					return;
				}

				alreadyExited = true;
				console.log("");
				logger.log("Exiting...");
				scss.stop();
				js.stop();
			};

			process.on("exit", exitCallback);
			process.on("SIGINT", exitCallback);
			process.on("SIGUSR1", exitCallback);
			process.on("SIGUSR2", exitCallback);
		}
	}
	catch (e)
	{
		if (config.verbose)
		{
			console.error(e);
		}

		if (/cannot find module.*?firefly\.js/i.test(e.message))
		{
			abortWithError(`Could not find ${blue("firefly.js")}`);
		}

		abortWithError(`Run Error: ${e.message}`);
	}
}
