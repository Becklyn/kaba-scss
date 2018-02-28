const csso = require("csso");
const fs = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const sass = require("node-sass");
const scssSyntax = require("postcss-scss");
const stylelint = require("stylelint");
const util = require("util");

/**
 * @typedef {{
 *      entry: string,
 *      start: number,
 *      includedFiles: string[],
 *      end: number,
 *      duration: number,
 * }} NodeSassBuildStats
 *
 * @typedef {{
 *      css: Buffer,
 *      map: *,
 *      stats: NodeSassBuildStats,
 * }} NodeSassBuildResult
 *
 * @typedef {{
 *      status: number,
 *      file: string,
 *      line: 11,
 *      column: 33,
 *      message: string,
 *      formatted: string,
 * }} NodeSassCompilationError
 */


class Compiler
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
         * @type {Logger}
         */
        this.logger = logger;

        /**
         * @private
         * @type {String}
         */
        this.stylelintConfigFile = require.resolve("kaba/.stylelintrc.yml");

        /**
         * @private
         * @type {postcss.Processor}
         */
        this.postProcessor = postcss([
            require("autoprefixer")({
                browsers: this.config.browserList,
            }),
            require("postcss-reporter")({
                clearReportedMessages: true,
            }),
        ]);
    }


    /**
     * Compiles the given entry
     *
     * @param {KabaScssEntry} entry
     * @param {boolean} lint
     * @return {?boolean}
     */
    async compile (entry, lint = true)
    {
        // start timer
        const start = process.hrtime();
        let hasLintError = null;

        // read file content
        const fileContent = await util.promisify(fs.readFile)(entry.src, "utf-8");

        // compile sass
        const sassResult = await this.compileScss(entry, fileContent);

        if (null === sassResult)
        {
            return;
        }

        /** @type {string} css */
        let css = sassResult.css;
        /** @type {NodeSassBuildStats} stats */
        const stats = sassResult.stats;

        // run post processor
        css = await this.postProcess(css, stats, entry);

        // if is debug = lint all files
        if (lint || this.config.fix)
        {
            hasLintError = this.lintAll([entry.src]);
        }

        // minify
        css = this.minifyCss(css);

        // write output
        await this.writeCssFile(css, entry);

        this.logger.logBuildSuccess(path.basename(entry.src), process.hrtime(start));
        return hasLintError;
    }


    /**
     *
     * @param {string} filePath
     */
    async lint (filePath)
    {
         this.lintAll([filePath]);
    }


    /**
     * Lints the given CSS code
     *
     * @private
     * @param {string[]} files
     * @return {boolean}
     */
    async lintAll (files)
    {
        /** @type {StylelintResult} outer */
        const outer = await stylelint.lint({
            configFile: this.stylelintConfigFile,
            files: files,
            formatter: "string",
            cache: true,
            fix: this.config.fix,
        });

        if (outer.output.length > 0)
        {
            console.log(outer.output);
        }

        return outer.errored;
    }


    /**
     * Compiles the code to CSS
     *
     * @private
     * @param {KabaScssEntry} entry
     * @param {string} fileContent
     * @return {Promise<NodeSassBuildResult>}
     */
    async compileScss (entry, fileContent)
    {
        try
        {
            return await util.promisify(sass.render)({
                data: fileContent,
                outputStyle: "compact",
                sourceMapEmbed: this.config.includeSourceMaps,
                includePaths: [
                    path.dirname(entry.src),
                ],
            });
        }
        catch (error)
        {
            this.logger.logCompileError(error);
            return null;
        }
    }


    /**
     * Handles the post processing
     *
     * @private
     * @param {string} css
     * @param {NodeSassBuildStats} stats
     * @param {KabaScssEntry} entry
     */
    async postProcess (css, stats, entry)
    {
        return this.postProcessor
            .process(css, {
                from: entry.outFilePath,
            })
            .then(
                result => this.minifyCss(result.css, stats, entry)
            )
            .catch(
                error => this.logger.log(chalk`{red PostCSS Error} in file {yellow ${path.basename(entry.src)}}: ${error.message}`)
            );
    }


    /**
     * @private
     * @param {string} css
     */
    minifyCss (css)
    {
        return !this.config.isDebug
            ? csso.minify(css).css
            : css;
    }


    /**
     * Writes the output css file
     *
     * @private
     * @param {string} css
     * @param {KabaScssEntry} entry
     */
    async writeCssFile (css, entry)
    {
        // ensure that the output directory exists
        return util.promisify(fs.ensureDir)(entry.outDir)
            .then(
                () => util.promisify(fs.writeFile)(entry.outFilePath, css)
            );
    }
}

module.exports = Compiler;
