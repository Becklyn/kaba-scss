const {gray, green, red, yellow} = require("kleur");
const prettyHrtime = require("pretty-hrtime");
const path = require("path");


interface CompilationError
{
    file: string;
    line: number;
    message: string;
    formatted?: string|null;
}

/**
 * Logger with an optional prefix
 */
export class PrefixedLogger
{
    private prefix: string;
    private cwd: string|null;


    /**
     *
     */
    public constructor (prefix: string = "", cwd: string|null = null)
    {
        this.prefix = prefix;
        this.cwd = cwd;
    }


    /**
     * Logs the start of a build
     */
    public logBuildStart () : void
    {
        this.log(green("Build started"));
    }


    /**
     * Logs a build success
     */
    public logBuildSuccess (fileName: string, duration: [number, number]) : void
    {
        this.logWithDuration(`${green("Build finished")}: ${yellow(fileName)}`, duration);
    }


    /**
     * Logs a message with a duration
     */
    logWithDuration (message: string, duration: [number, number]) : void
    {
        this.log(`${message} after ${prettyHrtime(duration)}`);
    }


    /**
     * Logs an error
     */
    public logError (message: string, error: Error|{message: string}) : void
    {
        this.log(`${red(message)}: ${error.message}`);
    }


    /**
     * Logs a compilation error with the code fragment
     */
    public logCompileError (error: CompilationError) : void
    {
        let message = error.message.split("\n")
            .map(line => `    ${line}`)
            .join("\n");
        let output = `\n${message}\n`;
        let file = null !== this.cwd
            ? path.relative(this.cwd, error.file)
            : error.file;

        if (error.formatted != null)
        {
            let codeSegment = error.formatted
                .split("\n")
                .splice(2)
                .join("\n");

            output += `${codeSegment}\n`;
        }

        this.logToolOutput(
            `${red("Compilation Error")} in file ${yellow(file)} on line ${yellow(error.line)}:`,
            output
        );
    }


    /**
     * Writes a log message
     */
    public log (message: string) : void
    {
        this.output(`${gray(this.getCurrentTime())} ${this.prefix} ${message}`);
    }


    /**
     * Logs the output of a tool
     */
    public logToolOutput (message: string, output: string): void
    {
        this.log(message);
        this.output(output);
    }


    /**
     * Returns the formatted current time string
     */
    private getCurrentTime () : string
    {
        const now = new Date();
        return [now.getHours(), now.getMinutes(), now.getSeconds()]
            .map(
                val => ("" + val).padStart(2, "0")
            )
            .join(":");
    }


    /**
     * Outputs the message
     */
    protected output (message: string) : void
    {
        console.log(message);
    }
}
