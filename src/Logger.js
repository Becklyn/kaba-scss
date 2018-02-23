const chalk = require("chalk");
const prettyHrTime = require("pretty-hrtime");
const strftime = require('strftime');

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
        this.writeLogMessage(chalk`{green Build finished}: {yellow ${entry.outFileName}} in ${prettyHrTime(duration)}`);
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
        console.log(chalk`{gray ${strftime('%H:%M:%S')}} {bgMagenta.black  SCSS } ${message}`);
    }
}

module.exports = Logger;
