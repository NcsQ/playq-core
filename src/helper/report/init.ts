
const fs = require("fs-extra");

try {
    fs.ensureDirSync("test-results/screenshots");
    fs.emptyDirSync("test-results/screenshots");

    fs.ensureDirSync("test-results/videos");
    fs.emptyDirSync("test-results/videos");

    fs.ensureDirSync("test-results/trace");
    fs.emptyDirSync("test-results/trace");

    // Do NOT clean the whole test-results folder!
    // fs.emptyDirSync("test-results");
} catch (error) {
    console.log("⚠️ Folder setup failed! " + error);
}
