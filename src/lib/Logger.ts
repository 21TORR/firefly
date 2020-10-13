import {gray, green, red, yellow} from "kleur";
const prettyHrtime = require("pretty-hrtime");

interface FileError
{
    file: string;
    line: number;
    message: string;
    formatted: string;
}

interface LogOptions {
    duration?: [number, number];
    details?: string;
    detailsPadding?: boolean;
}

/**
 * Logger for all kinds of messages
 */
export class Logger
{
    private readonly prefix: string;


    /**
     *
     */
    constructor (prefix: string)
    {
        this.prefix = prefix;
    }


    /**
     * Writes a log message
     */
    public log (message: string, options: LogOptions = {}): void
    {
        // prefix message
        message = `${gray(this.currentTime)} ${this.prefix} ${message}`;

        if (options.duration)
        {
            message += ` after ${prettyHrtime(options.duration)}`;
        }

        if (options.details)
        {
            let renderedDetails = options.details.trim()
                .split("\n")
                .map(line => ` ${gray("│")} ${line.trimEnd()}`)
                .join("\n");

            if (false !== options.detailsPadding)
            {
                renderedDetails = ` ${gray("│")}\n${renderedDetails}\n ${gray("│")}`;
            }

            message += `\n${renderedDetails}\n ${gray("╰─")}`;
        }

        console.log(message);
    }


    /**
     * Returns the current time
     */
    private get currentTime (): string
    {
        const now = new Date();

        return [
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0"),
            String(now.getSeconds()).padStart(2, "0"),
        ].join(":");
    }


    /**
     * Adds new lines
     */
    private newLine (lines: number = 1): void
    {
        for (let i = 0; i < lines; i++)
        {
            console.log("");
        }
    }
}
