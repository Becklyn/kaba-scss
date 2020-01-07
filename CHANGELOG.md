3.3.0
=====

*   (internal) Add compilation tests, to check whether the `KabaScss` compiler itself is working.
*   (bug) Fix the broken source map generation in CSSO.
*   (feature) Add test helpers to ease SCSS compilation testing in libraries. 
*   (internal) Fix npmignore to ignore all tests, except the helpers.


3.2.0
=====

*   (feature) Added `MemoryLogger` to ease debugging.


3.1.2
=====

*   (improvement) all dependencies were bumped, that mainly includes `csso` v4 and `stylelint` v12


3.1.1
=====

*   Only lint files from the project directory.


3.1.0
=====

*   Enable grid support in autoprefixer



3.0.3
=====

*   Updated the list of allowed element types in SCSS, added: `img`


3.0.2
=====

*   Updated the list of allowed element types in SCSS, added: `strong` + `em`


3.0.1
=====

*   Improved debug compiled CSS: not minified anymore + source comments.


3.0.0
=====

*   The `browserList` config was removed.


2.1.0
=====

*   Ensure that compiled CSS file is always written.


2.0.0
=====

*   BC Break: Change config parameters
*   The `logger` parameter for the constructor is now optional .
*   Always build (external) source maps
*   Added own logger implementation
*   Fix source maps support
*   Lint files only once, even if `node-sass` reports them multiple times.
*   Change implementation to TypeScript
*   Internal refactoring and simplifications
*   Add GitHub infrastructure (like Changelog, Update files and PR template)
*   Update ignore files for TypeScript builds
*   Updated `kleur` to 3.0

