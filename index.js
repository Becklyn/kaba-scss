const chokidar = require("chokidar");
const Compiler = require("./src/Compiler");
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
 *      lint: boolean,
 *      analyze: boolean,
 *      cwd: string,
 *      browserlist: string[],
 * }} KabaScssConfig
 *
 *
 * @typedef {{
 *      errored: boolean,
 *      output: string,
 *      postcssResult: LazyResult[],
 *      results: array,
 * }} StylelintResult
 */

/**
 * Main kaba scss builder
 */
class KabaScss
{
    /**
     * @param {KabaScssConfig} config
     * @param {Logger} logger
     */
    constructor (config, logger)
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
        this.logger = logger;

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
     * @param {?string} outFileName
     */
    addEntry (src, outDir, outFileName = null)
    {
        // remove trailing slash
        outDir = outDir.replace(/\/+$/, "");

        if (null === outFileName)
        {
            outFileName = this.generateOutputFileName(src);
        }

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
     * @param {boolean} lint
     * @return {boolean}
     */
    async compileAll (lint)
    {
        this.logger.logBuildStart();

        const hasLintErrors = await Promise.all(
            this.entries.map(entry => this.compiler.compile(entry, lint))
        );

        return hasLintErrors.includes(true);
    }


    /**
     * Callback on when a file has changed
     *
     * @private
     * @param {string} file
     */
    onChangedFile (file)
    {
        if (this.config.lint)
        {
            this.compiler.lint(file);
        }

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
     *
     * @return {?boolean}
     */
    async run ()
    {
        const hasLintError = await this.compileAll(this.config.lint);

        if (this.config.analyze)
        {
            return hasLintError;
        }

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

        return null;
    }
}


module.exports = KabaScss;
