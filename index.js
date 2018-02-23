const chokidar = require("chokidar");
const Compiler = require("./src/Compiler");
const Logger = require("./src/Logger");
const path = require("path");

/**
 * @typedef {{
 *      src: string,
 *      outDir: string,
 *      outFileName: string,
 *      outFilePath: string,
 * }} KabaScssEntry
 *
 *
 * @typedef {{
 *      isDebug: boolean,
 *      includeSourceMaps: boolean,
 *      browserlist: string[],
 * }} KabaScssConfig
 */

/**
 * Main kaba scss builder
 */
class KabaScss
{
    /**
     * @param {KabaScssConfig} config
     */
    constructor (config)
    {
        /**
         * @private
         * @type {KabaScssConfig}
         */
        this.config = config;

        /**
         * @private
         * @type {KabaScssEntry[]}
         */
        this.entries = [];

        /**
         * @private
         * @type {Logger}
         */
        this.logger = new Logger();

        /**
         * @private
         * @type {Compiler}
         */
        this.compiler = new Compiler(config, this.logger);
    }


    /**
     * @param {string} src
     * @param {string} outDir
     */
    addEntry (src, outDir)
    {
        // remove trailing slash
        outDir = outDir.replace(/\/+$/, "");
        const outFileName = this.generateOutputFileName(src);

        this.entries.push({
            src: src,
            outDir: outDir,
            outFileName: outFileName,
            outFilePath: `${outDir}/${outFileName}`,
        });
    }


    /**
     * Compiles all entry files
     *
     * @private
     */
    compileAll ()
    {
        this.entries.forEach(entry => this.compiler.compile(entry));
    }


    /**
     * Returns the output file name
     *
     * @private
     * @param {string} input
     * @return {string}
     */
    generateOutputFileName (input)
    {
        return path.basename(input).replace(/\.scss$/, ".css");
    }




    run ()
    {
        this.compileAll();
    }
}


module.exports = KabaScss;
