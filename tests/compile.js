import {testScssCompilation} from "./helpers/test-helper";
const path = require("path");

[
    {debug: true},
    {debug: false},
]
    .forEach(options => testScssCompilation(path.join(__dirname, "fixtures/scss/simple.scss"), options));
