import test from "ava";
import path from "path";
import fs from "fs-extra";
import glob from "glob";
import stylelint from "stylelint";


/**
 * @typedef {{
 *     line: number,
 *     column: number,
 *     rule: string,
 *     severity: string,
 *     text: string,
 * }} StylelintWarning
 */

// Tests all stylelint rules. If there is a JSON file it is expected to contain the violation types.
// If there is no such file, the file is expected to have no violations.

glob.sync(path.join(__dirname, "fixtures/stylelint-rules/*.scss")).forEach(file => {

    test(`File: ${path.basename(file)}`, async t => {
        let violations = parseViolations(file.replace(/\.scss$/, ".json"));
        let output = await stylelint.lint({
            configFile: path.join(__dirname, "../.stylelintrc.yml"),
            files: [file],
            formatter: "string",
        });

        let result = output.results[0];
        t.is(!!result.errored, Object.keys(violations).length > 0, "Tests whether there were errors expected and didn't occur (or vice versa).");
        Object.keys(violations).forEach(rule => {
            let expectedMessage = violations[rule];

            t.truthy(result.warnings.map(warning => warning.rule).includes(rule), `Contains rule: ${rule}`);

            if (expectedMessage !== true)
            {
                t.regex(collectViolationMessagesForRule(result.warnings, rule), new RegExp(expectedMessage), `Match message of rule '${rule}'`);
            }
        });
    });
});


/**
 *
 * @param {StylelintWarning[]} warnings
 * @param {string} rule
 */
function collectViolationMessagesForRule (warnings, rule)
{
    let messages = [];

    for (let warning of warnings)
    {
        if (warning.rule === rule)
        {
            messages.push(warning.text);
        }
    }

    return messages.join("\n");
}


/**
 * Parses the violations into a map of type -> RegExp|true.
 * The message can be true, it will match anything then.
 *
 * @param {string} violationsFilePath
 * @returns {Object<string,RegExp|boolean>}
 */
function parseViolations (violationsFilePath)
{
    if (!fs.pathExistsSync(violationsFilePath))
    {
        return {};
    }

    let data = require(violationsFilePath);

    if (!Array.isArray(data))
    {
        return data;
    }

    let violations = {};
    data.forEach(rule => violations[rule] = true);
    return violations;
}
