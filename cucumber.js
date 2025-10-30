
module.exports = {
    default: {
        formatOptions: {
            snippetInterface: "async-await"
        },
        paths: [
             "./_TEMP/execution/**/*.feature"
        ],
        dryRun: false,
        require: [
            "ts-node/register", // <-- Should be in top
            "tsconfig-paths/register",  // <-- added to enable path aliasing
            "./src/global.ts", // Should be belore the steps and hooks
            "./test/steps/**/*.ts",
            "./extend/addons/**/*.ts",
            "./src/helper/actions/*.ts",
            "./src/helper/actions/hidden/*.ts",
            "config/cucumber/hooks.ts",
            "config/cucumber/stepHook.ts"
        ],
        requireModule: [
            "ts-node/register",
            "tsconfig-paths/register"
        ],
        format: [
            "progress-bar",
            "html:test-results/cucumber-report.html",
            "json:test-results/cucumber-report.json",
            "rerun:@rerun.txt",
        ],
        parallel: 1
    },
}