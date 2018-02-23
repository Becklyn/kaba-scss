const path = require("path");
const prettyHrTime = require("pretty-hrtime");

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
        console.error(error);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logFileReadError (entry, error)
    {
        console.error(`File read failed for file ${path.basename(entry.src)}: ${error.message}`);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logFileWriteError (entry, error)
    {
        console.error(`File write failed for file ${entry.outFileName}: ${error.message}`);
    }


    /**
     *
     * @param {KabaScssEntry} entry
     * @param {NodeSassBuildStats} stats
     * @param duration
     */
    logBuildSuccess (entry, stats, duration)
    {
        console.log(`Build finished: ${entry.outFileName} in ${prettyHrTime(duration)}`);
    }


    /**
     * @param {KabaScssEntry} entry
     * @param {Error} error
     */
    logPostCssError (entry, error)
    {
        console.error(`PostCSS failed for file ${entry.outFileName}: ${error.message}`);
    }
}

module.exports = Logger;
