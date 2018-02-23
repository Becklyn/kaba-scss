const chalk = require("chalk");
const path = require("path");
const prettyHrTime = require("pretty-hrtime");
const strftime = require('strftime');

class Logger
{
    constructor ()
    {

    }


    /**
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logBuildError (entry, error)
    {
        this.writeLogMessage(chalk`{red Build Error}: ${error.message}`);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logFileReadError (entry, error)
    {
        const message = `File read failed for file ${path.basename(entry.src)}: ${error.message}`;
        this.writeLogMessage(chalk`{red File Error}: ${message}`);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logFileWriteError (entry, error)
    {
        const message = `File write failed for file ${entry.outFileName}: ${error.message}`;
        this.writeLogMessage(chalk`{red File Error}: ${message}`);
    }


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
        this.writeLogMessage(chalk`{red  PostCSS Error } in file ${filePath}: ${error.message}`);
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
