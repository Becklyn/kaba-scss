"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { red, yellow } = require("kleur");
const csso = require("csso");
const fs = require("fs-extra");
const path = require("path");
// @ts-ignore
const postcss = require("postcss");
const sass = require("sass");
const stylelint = require("stylelint");
class Compiler {
    /**
     *
     */
    constructor(options, logger) {
        this.options = options;
        this.logger = logger;
        this.stylelintConfigFile = path.join(__dirname, "../.stylelintrc.yml");
        this.postProcessor = postcss([
            require("autoprefixer")({
                browsers: this.options.browserList,
            }),
            require("postcss-reporter")({
                clearReportedMessages: true,
            }),
        ]);
    }
    /**
     * Compiles the given entry
     *
     */
    async compile(entry, lint = true) {
        // start timer
        const start = process.hrtime();
        let fileContent = "";
        try {
            // read file content
            fileContent = await fs.readFile(entry.src, "utf-8");
        }
        catch (e) {
            if ("ENOENT" === e.code) {
                this.logger.log(`${yellow("SKIPPED")} build of ${yellow(entry.relativeSrc)} as file was not found`);
            }
            else {
                this.logger.logError("File load error", {
                    message: e.toString()
                });
            }
            return true;
        }
        let sassResult = null;
        // compile sass
        try {
            sassResult = await this.compileScss(entry, fileContent);
        }
        catch (e) {
            this.logger.logError(e.message);
            return true;
        }
        let compiled = await this.postProcess(sassResult, entry);
        // always lint, as we need the info whether there are errors
        let hasLintError = await this.lintAll([entry.src].concat(sassResult.stats.includedFiles), lint);
        // write output
        await this.writeFiles(compiled.css, compiled.map, entry);
        this.logger.logBuildSuccess(entry.basename, process.hrtime(start));
        return hasLintError;
    }
    /**
     * Lints the given file
     */
    async lint(filePath, printResults = true) {
        return this.lintAll([filePath], printResults);
    }
    /**
     * Lints the given CSS code.
     *
     * Returns whether there were any lint errors
     */
    async lintAll(files, printResults = true) {
        files = files.filter(filePath => !/\/(node_modules|vendor)\//.test(filePath));
        if (files.length === 0) {
            return false;
        }
        const outer = await stylelint.lint({
            configFile: this.stylelintConfigFile,
            files: files,
            formatter: "string",
            cache: true,
            fix: this.options.fix,
        });
        if (printResults && "" !== outer.output) {
            console.log(outer.output);
        }
        return outer.errored;
    }
    /**
     * Compiles the code to CSS
     */
    async compileScss(entry, fileContent) {
        return sass.renderSync({
            data: fileContent,
            file: entry.src,
            outFile: entry.outFilePath,
            sourceMap: true,
            includePaths: [
                path.dirname(entry.src),
            ],
            outputStyle: "compressed",
            importer: (url) => this.resolveImport(url),
        });
    }
    /**
     * Handles the post processing
     */
    async postProcess(css, entry) {
        try {
            return await this.postProcessor.process(css.css, {
                from: entry.src,
                to: entry.outFilePath,
                map: {
                    annotation: false,
                    inline: false,
                    prev: css.map.toString(),
                }
            });
        }
        catch (error) {
            this.logger.log(`${red("PostCSS Error")} in file ${yellow(entry.basename)}: ${error.message}`);
            throw error;
        }
    }
    /**
     * Writes the output css file
     */
    async writeFiles(css, sourceMap, entry) {
        return fs.ensureDir(entry.outDir)
            .then(() => {
            fs.writeFile(entry.outFilePath, css);
            fs.writeFile(entry.mapFilePath, sourceMap.toString());
        });
    }
    /**
     * Resolves sass imports
     */
    resolveImport(url) {
        if (url[0] === "~") {
            // map of file extensions and whether the file should be directly loaded or just as path returned
            const extensions = {
                ".scss": false,
                ".css": true,
                "": false,
            };
            for (const extension in extensions) {
                try {
                    const loadFileContent = extensions[extension];
                    const filePath = require.resolve(`${url.substr(1)}${extension}`);
                    if (loadFileContent) {
                        return {
                            contents: fs.readFileSync(filePath, "utf-8"),
                        };
                    }
                    else {
                        return {
                            file: filePath,
                        };
                    }
                }
                catch (e) {
                    // ignore error
                }
            }
        }
        return {
            file: url,
        };
    }
}
exports.Compiler = Compiler;
