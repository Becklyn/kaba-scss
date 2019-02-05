import {Result} from "sass";
import {SourceMapGenerator} from "source-map";
import {CompilationEntry, KabaScssOptions, UniqueKeyMap} from "./index";
import {PrefixedLogger} from "./PrefixedLogger";

const {red, yellow} = require("kleur");
const fs = require("fs-extra");
const path = require("path");
// @ts-ignore
const postcss = require("postcss");
const sass = require("sass");
const stylelint = require("stylelint");


interface CompiledCss
{
    map: SourceMapGenerator,
    css: string;
}


export class Compiler
{
    private options: KabaScssOptions;
    private logger: PrefixedLogger;
    private stylelintConfigFile: string;
    private postProcessor: any;

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
    public async compile (entry: CompilationEntry, lint: boolean = true) : Promise<boolean>
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

        let sassResult = null;


        // compile sass
        try
        {
            sassResult = await this.compileScss(entry, fileContent);
        }
        catch (e)
        {
            e.formatted = null;
            this.logger.logCompileError(e);
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

        files.forEach(
            filePath =>
            {
                if (filePath[0] !== "~" && !/\/(node_modules|vendor)\//.test(filePath))
                {
                    filesToLintMap[filePath] = true;
                }
            }
        );

        let filesToLint = Object.keys(filesToLintMap);

        if (filesToLint.length === 0)
        {
            return false;
        }

        let outer = await stylelint.lint({
            configFile: this.stylelintConfigFile,
            files: filesToLint,
            formatter: "string",
            cache: true,
            fix: this.options.fix,
        });

        if (printResults && "" !== outer.output)
        {
            this.logger.logToolOutput(`Found ${outer.postcssResults.length} Stylelint issues:`, outer.output);
        }

        return outer.errored;
    }


    /**
     * Compiles the code to CSS
     */
    private async compileScss (entry: CompilationEntry, fileContent: string): Promise<Result>
    {
        return sass.renderSync({
            data: fileContent,
            file: entry.src,
            outFile: entry.outFilePath,
            sourceMap: true,
            includePaths: [
                path.dirname(entry.src),
            ],
            outputStyle: "compressed",
            importer: (url: string) => this.resolveImport(url),
        });
    }


    /**
     * Handles the post processing
     */
    private async postProcess (css: Result, entry: CompilationEntry) : Promise<CompiledCss>
    {
        try
        {
            return await this.postProcessor.process(css.css, {
                from: entry.src,
                to: entry.outFilePath,
                map: {
                    annotation: false, //this.options.debug,
                    inline: false,
                    prev: (css.map as Buffer).toString(),
                }
            }) as CompiledCss;
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
    private async writeFiles (css: string, sourceMap: SourceMapGenerator, entry: CompilationEntry): Promise<void>
    {
        return fs.ensureDir(entry.outDir)
            .then(
                () =>
                {
                    fs.writeFile(entry.outFilePath, css);
                    fs.writeFile(entry.mapFilePath, sourceMap.toString());
                }
            );
    }


    /**
     * Resolves sass imports
     */
    private resolveImport (url: string): {file: string}|{contents: string}
    {
        if (url[0] === "~")
        {
            // map of file extensions and whether the file should be directly loaded or just as path returned
            let extensions: {[extension: string]: boolean} = {
                ".scss": false,
                ".css": true,
                "": false,
            };

            for (let extension in extensions)
            {
                try {
                    let loadFileContent = extensions[extension];
                    let filePath = require.resolve(`${url.substr(1)}${extension}`);

                    if (loadFileContent)
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
