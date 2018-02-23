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
 *      isWatch: boolean,
 *      cwd: string,
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
     * Adds an entry point to compile
     *
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
    compileAll (lint)
    {
        this.logger.logBuildStart();
        this.entries.forEach(entry => this.compiler.compile(entry, lint));
    }


    /**
     * Callback on when a file has changed
     *
     * @private
     * @param {string} file
     */
    onChangedFile (file)
    {
        this.compiler.lint(file);
        this.compileAll(false);
    }


    /**
     * Returns all entry dirs
     *
     * @private
     * @return {string[]}
     */
    getEntryDirGlobs ()
    {
        const globs = {};

        this.entries.forEach(
            (entry) => {
                const dir = path.dirname(entry.src);
                const glob = `${dir}/**/*.scss`;
                globs[glob] = true;
            }
        );

        return Object.keys(globs);
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


    /**
     * Runs the task
     */
    run ()
    {
        this.compileAll(true);

        if (this.config.isWatch)
        {
            const watcher = chokidar.watch([],{
                persistent: true,
                cwd: this.config.cwd,
                ignoreInitial: true,
            });

            watcher
                .on("add", (path) => this.onChangedFile(path))
                .on("change", (path) => this.onChangedFile(path))
                .on("unlink", (path) => this.onChangedFile(path));

            watcher.add(this.getEntryDirGlobs());
        }
    }
}


module.exports = KabaScss;
