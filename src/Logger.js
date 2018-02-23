const chalk = require("chalk");

/**
 * Logger for all kinds of messages
 */
class Logger
{
    /**
     * Logs the start of a build
     */
    logBuildStart ()
    {
        this.writeLogMessage(chalk`{green Build started}`);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {NodeSassBuildStats} stats
     * @param duration
     */
    logBuildSuccess (entry, stats, duration)
    {
        this.writeLogMessage(chalk`{green Build finished}: {yellow ${entry.outFileName}} in ${this.formatDuration(duration)}`);
    }


    /**
     * @param {string} filePath
     * @param {Error} error
     */
    logPostCssError (filePath, error)
    {
        this.writeLogMessage(chalk`{red PostCSS Error } in file ${filePath}: ${error.message}`);
    }


    /**
     * Logs a node-sass compilation error
     *
     * @param {NodeSassCompilationError} error
     */
    logScssCompileError (error)
    {
        this.writeLogMessage(chalk`{red Compilation Error} in file {yellow ${error.file}} on line {yellow ${error.line}}:`);
        console.log(`    ${error.message}`);
        console.log("");
        console.log(error.formatted.split("\n").splice(2).join("\n"));
        console.log("");
    }


    /**
     * Writes a log message
     *
     * @private
     * @param {string} message
     */
    writeLogMessage (message)
    {
        console.log(chalk`{gray ${this.getCurrentTime()}} {bgMagenta.black  SCSS } ${message}`);
    }


    /**
     * Returns the current time
     *
     * @private
     * @return {string}
     */
    getCurrentTime ()
    {
        const now = new Date();

        return `${this.padTime(now.getHours())}:${this.padTime(now.getMinutes())}:${this.padTime(now.getSeconds())}`;
    }


    /**
     * Pads the time
     *
     * @private
     * @param {number} time
     * @return {string}
     */
    padTime (time)
    {
        return ("" + time).padStart(2, "0");
    }


    /**
     * Formats the duration
     *
     * @private
     * @param {number[]} duration
     */
    formatDuration (duration)
    {
        const [seconds, nanoseconds] = duration;
        const milliseconds = Math.round(nanoseconds / 1000000);

        return (seconds * 1000 + milliseconds) + " ms";
    }
}

module.exports = Logger;
