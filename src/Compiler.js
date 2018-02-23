const csso = require("csso");
const fs = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const sass = require("node-sass");
const scssSyntax = require("postcss-scss");

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
            require("stylelint", {

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

            }),
            require("postcss-reporter")({
                clearReportedMessages: true,
            }),
        ]);
    }


    /**
     * @param {KabaScssEntry} entry
     */
    compile (entry)
    {
        fs.readFile(
            entry.src,
            'utf-8',
            (error, contents) =>
            {
                if (error)
                {
                    this.logger.logFileReadError(error);
                    return;
                }

                if (this.config.isDebug)
                {
                    this.lint(entry, contents);
                }

                this.compileScss(entry, contents);
            }
        );
    }


    /**
     * Lints the given CSS code
     *
     * @private
     * @param {KabaScssEntry} entry
     * @param {string} fileContent
     */
    lint (entry, fileContent)
    {
        this.linter
            .process(fileContent, {
                from: entry.src,
                syntax: scssSyntax,
            })
            .catch(error => this.logger.logPostCssError(entry, error));
    }


    /**
     * Compiles the code to CSS
     *
     * @private
     * @param {KabaScssEntry} entry
     * @param {string} fileContent
     */
    compileScss (entry, fileContent)
    {
        sass.render(
            {
                data: fileContent,
                outputStyle: 'compact',
                sourceMapEmbed: this.config.includeSourceMaps,
                includePaths: [
                    path.dirname(entry.src),
                ],
            },
            /**
             * @param {Error} error
             * @param {NodeSassBuildResult} result
             */
            (error, result) =>
            {
                if (error)
                {
                    this.logger.logBuildError(entry, error);
                    return;
                }

                this.postProcess(result.css, result.stats, entry);
            }
        );
    }


    /**
     * Handles the post processing
     *
     * @private
     * @param {string} css
     * @param {NodeSassBuildStats} stats
     * @param {KabaScssEntry} entry
     */
    postProcess (css, stats, entry)
    {
        this.postProcessor
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
     * @param {NodeSassBuildStats} stats
     * @param {KabaScssEntry} entry
     */
    minifyCss (css, stats, entry)
    {
        if (!this.config.isDebug)
        {
            css = csso.minify(css).css;
        }

        this.writeCssFile(css, stats, entry);
    }


    /**
     * Writes the output css file
     *
     * @private
     * @param {string} css
     * @param {NodeSassBuildStats} stats
     * @param {KabaScssEntry} entry
     */
    writeCssFile (css, stats, entry)
    {
        // ensure that the output directory exists
        fs.ensureDir(
            entry.outDir,
            error =>
            {
                if (error)
                {
                    this.logger.logFileWriteError(entry, error);
                    return;
                }

                // write file
                fs.writeFile(
                    entry.outFilePath,
                    css,
                    error => this.afterFileWritten(error, stats, entry)
                );
            }
        );
    }


    /**
     *
     * @private
     * @param {Error} error
     * @param {NodeSassBuildStats} stats
     * @param {KabaScssEntry} entry
     */
    afterFileWritten (error, stats, entry)
    {
        if (error)
        {
            this.logger.logFileWriteError(entry, error);
            return;
        }

        this.logger.logBuildSuccess(entry, stats);
    }
}

module.exports = Compiler;
