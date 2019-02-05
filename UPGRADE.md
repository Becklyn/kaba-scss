Upgrade from 1.x to 2.0
=======================

*   The option keys of the constructor have changed:
    *   `isDebug` -> now: `debug`
    *   `includeSourceMaps` -> now: `sourceMaps` 
    *   `isWatch` -> now: `watch` 
    *   `anaylze` -> was removed, as `run()` now always lints and returns the result.
*   The `logger` option of the constructor is now optional. 
