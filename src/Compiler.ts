import {SourceMapConsumer} from "source-map";
import {CompilationEntry, KabaScssOptions, UniqueKeyMap} from "./index";
import {PrefixedLogger} from "./PrefixedLogger";
import {red, yellow} from "kleur";
import {lint} from "stylelint";

const csso = require("csso");
import fs = require("fs-extra");
import path = require("path");
import postcss = require("postcss");
import sass = require("node-sass");

interface CompilationResult
{
    css: Buffer;
    map: Buffer;
    stats: {
        entry: string;
        start: number;
        includedFiles: string[];
        end: number;
        duration: number;
    };
}



/**
 * Compiles the given files
 */
export class Compiler
{
    private options: KabaScssOptions;
    private logger: PrefixedLogger;
    private stylelintConfigFile: string;
    private postProcessor: postcss.Processor;

    /**
     *
     */
    public constructor (options: KabaScssOptions, logger: PrefixedLogger)
    {
        this.options = options;
        this.logger = logger;
        this.stylelintConfigFile = path.join(__dirname, "../.stylelintrc.yml");
        this.postProcessor = postcss([
            require("autoprefixer")({
                grid: "no-autoplace",
            }),
            require("postcss-css-variables")(),
            require("postcss-reporter")({
                clearReportedMessages: true,
            }),
        ]);
    }


    /**
     * Compiles the given entry
     *
     */
    public async compile (entry: CompilationEntry, showLintErrors: boolean = true) : Promise<boolean>
    {
        // start timer
        let start = process.hrtime();
        let fileContent = "";

        try
        {
            // read file content
            fileContent = await fs.readFile(entry.src, "utf-8");
        }
        catch (e)
        {
            if ("ENOENT" === e.code)
            {
                this.logger.log(`${yellow("SKIPPED")} build of ${yellow(entry.relativeSrc)} as file was not found`);

            }
            else
            {
                this.logger.logError("File load error", e);
            }

            return true;
        }

        let sassResult;


        // compile sass
        try
        {
            sassResult = await this.compileScss(entry, fileContent);
        }
        catch (e)
        {
            this.logger.logCompileError(e);
            return true;
        }

        let result = await this.postProcess(sassResult, entry);

        // always lint, as we need the info whether there are errors
        let hasLintError = await this.lintAll([entry.src].concat(sassResult.stats.includedFiles), showLintErrors);

        if (!this.options.debug)
        {
            let minified = csso.minify(result.css, {
                filename: entry.src,
                sourceMap: true,
            });

            minified.map.applySourceMap(new SourceMapConsumer(result.map.toJSON()), entry.src);
            result = minified;
        }

        // write output
        await this.writeFiles(result.css, result.map.toString(), entry);

        this.logger.logBuildSuccess(entry.basename, process.hrtime(start));
        return hasLintError;
    }


    /**
     * Lints the given file
     */
    public async lint (filePath: string, printResults: boolean = true) : Promise<boolean>
    {
        return this.lintAll([filePath], printResults);
    }


    /**
     * Lints the given CSS code.
     *
     * Returns whether there were any lint errors
     */
    private async lintAll (files: string[], printResults: boolean = true) : Promise<boolean>
    {
        let filesToLintMap: UniqueKeyMap = {};

        files.forEach(filePath =>
        {
            if (
                filePath[0] !== "~"
                && !/\/(node_modules|vendor)\//.test(filePath)
                && filePath.startsWith(this.options.cwd)
            )
            {
                filesToLintMap[filePath] = true;
            }
        });

        let filesToLint = Object.keys(filesToLintMap);

        if (filesToLint.length === 0)
        {
            return false;
        }

        let outer = await lint({
            configFile: this.stylelintConfigFile,
            files: filesToLint,
            formatter: "string",
            cache: true,
            fix: this.options.fix,
        });

        if (printResults && "" !== outer.output)
        {
            this.logger.logToolOutput(`Found ${outer.results.length} Stylelint issues:`, outer.output);
        }

        return outer.errored;
    }


    /**
     * Compiles the code to CSS
     */
    private async compileScss (entry: CompilationEntry, fileContent: string): Promise<CompilationResult>
    {
        return new Promise(
            (resolve, reject) =>
            {
                sass.render(
                    {
                        data: fileContent,
                        file: entry.src,
                        outFile: entry.outFilePath,
                        sourceMap: true,
                        includePaths: [
                            path.dirname(entry.src),
                        ],
                        outputStyle: "expanded",
                        sourceComments: this.options.debug,
                        importer: (url: string, prev: string) => this.resolveImport(url, prev),
                    },
                    (error: Error|undefined, result: CompilationResult) =>
                    {
                        if (error)
                        {
                            return reject(error);
                        }

                        resolve(result);
                    }
                );
            }
        );
    }


    /**
     * Handles the post processing
     */
    private async postProcess (css: CompilationResult, entry: CompilationEntry) : Promise<postcss.Result>
    {
        try
        {
            return await this.postProcessor.process(css.css, {
                from: entry.src,
                to: entry.outFilePath,
                map: {
                    annotation: this.options.debug,
                    inline: false,
                    prev: css.map.toString(),
                },
            });
        }
        catch (error)
        {
            this.logger.log(`${red("PostCSS Error")} in file ${yellow(entry.basename)}: ${error.message}`);
            throw error;
        }
    }


    /**
     * Writes the output css file
     */
    private async writeFiles (css: string, sourceMap: string, entry: CompilationEntry): Promise<void>
    {
        await fs.ensureDir(entry.outDir);
        await Promise.all([
            fs.writeFile(entry.outFilePath, css),
            fs.writeFile(entry.mapFilePath, sourceMap),
        ]);
    }


    /**
     * Resolves sass imports
     */
    private resolveImport (url: string, prev: string): {file: string}|{contents: string}
    {
        if (url[0] === "~")
        {
            // map of file extensions and whether the file should be directly loaded or just as path returned
            const fileNamePatterns: {[extension: string]: boolean} = {
                "_%s.scss": false,
                "_%s.css": true,
                "%s.scss": false,
                "%s.css": true,
                "%s": false,
            };

            for (let pattern in fileNamePatterns)
            {
                try {
                    const shouldLoadFileContent = fileNamePatterns[pattern];
                    const importPath = url.substr(1);
                    const dir = path.dirname(importPath);
                    const filename = path.basename(importPath);

                    const filePath = require.resolve(
                        `${dir}/${pattern.replace('%s', filename)}`, {
                            paths: [
                                path.dirname(prev),
                                process.cwd(),
                            ],
                        },
                    );

                    if (shouldLoadFileContent)
                    {
                        return {
                            contents: fs.readFileSync(filePath, "utf-8"),
                        };
                    }
                    else
                    {
                        return {
                            file: filePath,
                        };
                    }
                }
                catch (e)
                {
                    // ignore error
                }
            }
        }

        return {
            file: url,
        };
    }
}
