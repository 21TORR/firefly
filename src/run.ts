import {bgRed, blue, gray, green, red, cyan} from "kleur";
import {FireflyTypes} from "./@types/firefly";
import {Logger} from "./lib/Logger";
import {Firefly} from "./Firefly";
import {ScssBuilder} from "./builder/ScssBuilder";
import {JsBuilder} from "./builder/JsBuilder";
import {magenta, yellow} from 'kleur/colors';


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
	const cwd = process.cwd();

	try
	{
		const instance = require(`${cwd}/firefly.js`);

		if (!(instance instanceof Firefly))
		{
			abortWithError(
				`Found build file ${blue("firefly.js")}, but got invalid return value. Must be instance of 'Firefly'.`
			);
		}

		instance.startInternalCompilation();

		const scss = new ScssBuilder(config, instance.generateScssBuildConfig(config));
		const js = new JsBuilder(config, instance.generateJsBuildConfig(config));

		Promise.all([scss.run(), js.run(cwd)])
			.then(([scssResult, jsResult]: [boolean|null, boolean|null]) =>
			{
				// if we are exiting a watcher, just return neutral
				if (config.watch)
				{
					logger.log(`Ended watching`, {
						duration: process.hrtime(start),
					});
					process.exit(0);
				}

				const allOk = false !== scssResult && false !== jsResult;
				const status = (succeeded: boolean|null) => {
					if (null === succeeded)
					{
						return gray("skipped");
					}

					return succeeded ? green("succeeded") : red("failed")
				};

				logger.log(`Build ${status(allOk)}`, {
					duration: process.hrtime(start),
					details: `${magenta("SCSS")} ${status(scssResult)}\n${yellow("JS")} ${status(jsResult)}`,
				});
				process.exit(allOk ? 0 : 1);
			})
			.catch((...args) => {
				console.log("Running the build failed", args);
				process.exit(3);
			});


		if (config.watch)
		{
			let alreadyExited = false;
			const exitCallback = () =>
			{
				if (alreadyExited)
				{
					return;
				}

				alreadyExited = true;
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
