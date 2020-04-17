import test from "ava";
import {KabaScss} from "../../src/index";
import {MemoryLogger} from "../../src/Logger/MemoryLogger";
import {gray, red} from "kleur";
const path = require("path");
const fs = require("fs-extra");

/**
 *
 * @param {string} scssFilePath
 * @param {KabaScssOptions} options
 */
export function testScssCompilation (scssFilePath, options = {})
{
    if (options.lint !== undefined && options.lint !== true)
    {
        throw new Error(red("Test definition error:\nCan't set the `lint` option to anything besides true (as otherwise the errors that can fail the test are not visible)."));
    }

    let relativeFilePath = path.relative(process.cwd(), scssFilePath);

    test(
        `Compile SCSS file '${relativeFilePath}' with options: ${JSON.stringify(options)}`,
        /** @var {ava.Assertions} t */
        async t =>
        {
            const outputDir = path.join(__dirname, ".dist");
            fs.removeSync(outputDir);

            // force lint to true to always show the errors
            options.lint = true;
            const logger = new MemoryLogger();
            const compiler = new KabaScss(options, logger);

            compiler.addEntry(scssFilePath, outputDir);
            let result = await compiler.run();
            let output = logger.getOutput();

            if (true === result && /Build started/.test(output) && /Build finished/.test(output))
            {
                t.pass("Result ok, and build seems to have finished successfully");
            }
            else
            {
                t.fail(
                    "Test failed with output:\n" +
                    output.split("\n").map(l => `${gray("|")}    ${l}`).join("\n") +
                    "\n"
                );
            }

            // clean
            fs.removeSync(outputDir);
        }
    );
}
