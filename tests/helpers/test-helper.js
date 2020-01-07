import test from "ava";
import {KabaScss} from "../../src/index";
import {MemoryLogger} from "../../src/Logger/MemoryLogger";
const path = require("path");
const fs = require("fs-extra");

/**
 *
 * @param {string} scssFilePath
 * @param {KabaScssOptions} options
 */
export function testScssCompilation (scssFilePath, options = {})
{
    let relativeFilePath = path.relative(process.cwd(), scssFilePath);

    test(
        `Compile SCSS file '${relativeFilePath}' with options: ${JSON.stringify(options)}`,
        async t =>
        {
            const outputDir = path.join(__dirname, ".dist");
            fs.removeSync(outputDir);

            const logger = new MemoryLogger();
            const compiler = new KabaScss(options, logger);

            compiler.addEntry(scssFilePath, outputDir);
            let result = await compiler.run();

            t.is(result, false);
            t.regex(logger.getOutput(), /Build started/g);
            t.regex(logger.getOutput(), /Build finished/g);

            // clean
            fs.removeSync(outputDir);
        }
    );
}
