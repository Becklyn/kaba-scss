const csso = require("csso");
const fs = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const sass = require("node-sass");
const scssSyntax = require("postcss-scss");
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
         * @type {postcss.Processor}
         */
        this.linter = postcss([
            require("stylelint")({
                configFile: require.resolve("kaba/.stylelintrc.yml"),
            }),
            require("postcss-reporter")({
                clearReportedMessages: true,
            }),
        ]);

        /**
         * @private
         * @type {postcss.Processor}
         */
        this.postProcessor = postcss([
            require("autoprefixer")({
                browsers: this.config.browserlist,
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
     */
    async compile (entry, lint = true)
    {
        // start timer
        const start = process.hrtime();

        // read file content
        const fileContent = await util.promisify(fs.readFile)(entry.src, "utf-8");

        // compile sass
        const sassResult = await this.compileScss(entry, fileContent);
        /** @type {string} css */
        let css = sassResult.css;
        /** @type {NodeSassBuildStats} stats */
        const stats = sassResult.stats;

        // run post processor
        css = await this.postProcess(css, stats, entry);

        // if is debug = lint all files
        if (this.config.isDebug && lint)
        {
            this.lintAll([entry.src].concat(stats.includedFiles));
        }

        // minify
        css = this.minifyCss(css);

        // write output
        await this.writeCssFile(css, entry);

        this.logger.logBuildSuccess(entry, stats, process.hrtime(start));
    }


    /**
     *
     * @param {string} filePath
     */
    async lint (filePath)
    {
        return this.lintAll([filePath]);
    }


    /**
     * Lints the given CSS code
     *
     * @private
     * @param {string[]} files
     */
    async lintAll (files)
    {
        return files.forEach(
            async file => {
                try
                {
                    const fileContent = await util.promisify(fs.readFile)(file, "utf-8");

                    return await this.linter
                        .process(fileContent, {
                            from: file,
                            syntax: scssSyntax,
                        });
                }
                catch (error)
                {
                    this.logger.logPostCssError(file, error);
                }
            }
        );
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
        return util.promisify(sass.render)({
            data: fileContent,
            outputStyle: "compact",
            sourceMapEmbed: this.config.includeSourceMaps,
            includePaths: [
                path.dirname(entry.src),
            ],
        });
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
                error => this.logger.logPostCssError(entry, error)
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
