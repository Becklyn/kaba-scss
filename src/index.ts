import {Compiler} from "./Compiler";
import {PrefixedLogger} from "./PrefixedLogger";
const {bgMagenta, white} = require("kleur");
const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");


export interface KabaScssOptions
{
    debug: boolean;
    watch: boolean;
    lint: boolean;
    fix: boolean;
    cwd: string;
}

export interface CompilationEntry
{
    src: string;
    basename: string;
    relativeSrc: string;
    outDir: string;
    outFileName: string;
    outFilePath: string;
    mapFilePath: string;
}

export interface UniqueKeyMap
{
    [key: string]: boolean;
}

/**
 * Main kaba scss builder
 */
export class KabaScss
{
    private options: KabaScssOptions;
    private logger: PrefixedLogger;
    private entries: CompilationEntry[] = [];
    private finishedResolve: (() => void)|null = null;
    private compiler: Compiler;

    /**
     *
     */
    public constructor (options: Partial<KabaScssOptions>, logger: PrefixedLogger|null)
    {
        this.options = Object.assign({
            debug: false,
            watch: false,
            lint: false,
            fix: false,
            cwd: process.cwd(),
        }, options) as KabaScssOptions;

        this.logger = logger || new PrefixedLogger(bgMagenta(white(" SCSS ")), this.options.cwd);
        this.compiler = new Compiler(this.options, this.logger);
    }


    /**
     * Adds an entry point to compile
     */
    public addEntry (src: string, outDir: string, outFileName: string|null = null) : void
    {
        // remove trailing slash
        outDir = outDir.replace(/\/+$/, "");

        if (null === outFileName)
        {
            outFileName = this.generateOutputFileName(src);
        }

        let outFilePath = `${outDir}/${outFileName}`;

        this.entries.push({
            src: src,
            basename: path.basename(src),
            relativeSrc: path.relative(this.options.cwd, src),
            outDir: outDir,
            outFileName: outFileName,
            outFilePath: outFilePath,
            mapFilePath: `${outFilePath}.map`,
        });
    }


    /**
     * Compiles all entry files
     *
     * @private
     * @param {boolean} lint
     * @return {boolean} whether there were any lint errors
     */
    private async compileAll (lint: boolean) : Promise<boolean>
    {
        this.logger.logBuildStart();

        this.removeAllOutDirs();

        let hasLintErrors = await Promise.all(
            this.entries.map(entry => this.compiler.compile(entry, lint))
        );

        return hasLintErrors.includes(true);
    }


    /**
     * Remove all out dirs
     */
    private removeAllOutDirs () : void
    {
        let outDirs: UniqueKeyMap = {};

        Object.values(this.entries).forEach(
            entry => {
                outDirs[entry.outDir] = true;
            }
        );

        Object.keys(outDirs).forEach(
            dir => fs.removeSync(dir)
        );
    }


    /**
     * Callback on when a file has changed
     */
    private onChangedFile (file: string) : void
    {
        if (this.options.lint)
        {
            this.compiler.lint(file);
        }

        this.compileAll(false);
    }


    /**
     * Returns all entry dirs
     */
    private getEntryDirGlobs () : string[]
    {
        let globs: UniqueKeyMap = {};

        this.entries.forEach(
            (entry) => {
                let dir = path.dirname(entry.src);
                let glob = `${dir}/**/*.scss`;
                globs[glob] = true;
            }
        );

        return Object.keys(globs);
    }


    /**
     * Generates the output file name
     */
    private generateOutputFileName (input: string) : string
    {
        return path.basename(input).replace(/\.scss$/, ".css");
    }


    /**
     * Runs the task
     */
    public async run () : Promise<boolean|null>
    {
        let hasLintError = await this.compileAll(this.options.lint);

        if (this.options.watch)
        {
            let watcher = chokidar.watch([],{
                persistent: true,
                cwd: this.options.cwd,
                ignoreInitial: true,
            });

            watcher
                .on("add", (path: string) => this.onChangedFile(path))
                .on("change", (path: string) => this.onChangedFile(path))
                .on("unlink", (path: string) => this.onChangedFile(path))
                .add(this.getEntryDirGlobs());

            return new Promise(resolve => this.finishedResolve = resolve)
                .then(() => watcher.close());
        }

        return !hasLintError;
    }


    /**
     * Stops the watcher
     *
     * @returns {boolean}
     */
    public stop () : void
    {
        if (this.finishedResolve !== null)
        {
            this.finishedResolve();
        }
    }
}
