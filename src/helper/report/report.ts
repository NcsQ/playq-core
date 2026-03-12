const report = require("multiple-cucumber-html-reporter");
import * as fs from "fs";
import * as os from "os";


const jsonPath = "test-results/cucumber-report.json";
if (!fs.existsSync(jsonPath)) {
  console.warn("⚠️ cucumber-report.json not found.");
  const files = fs.readdirSync("test-results");
  console.warn("📁 test-results folder contains:", files);
} else {
  // 💡 Load JSON, patch paths, save back
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw);
  data.forEach((feature: any) => {
    if (feature.uri?.startsWith("_Temp/execution/")) {
      feature.uri = feature.uri.replace("_Temp/execution/", "");
    }
  });
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2)); // Save the cleaned version
}

// Removing "_Temp/execution/" from cucumber-report.html
const htmlReportPath = "test-results/cucumber-report.html";
if (fs.existsSync(htmlReportPath)) {
  let html = fs.readFileSync(htmlReportPath, "utf-8");
  // Use split/join for wide Node compatibility (avoid String.replaceAll requirement)
  const updatedHtml = html.split("_Temp/execution/").join("");

  fs.writeFileSync(htmlReportPath, updatedHtml, "utf-8");
  console.log("🧼 Cleaned cucumber-report.html by removing '_Temp/execution/'");
} else {
  console.warn("⚠️ cucumber-report.html not found.");
}

if (fs.existsSync(jsonPath)) {
  fs.unlinkSync(jsonPath);
  console.log(`🗑️ Removed existing ${jsonPath}`);
}


// Fetching the system details
const platformName = os.platform(); 
const platformVersion = os.release();
const deviceName = os.hostname(); 

report.generate({
  jsonDir: "test-results",
  reportPath: "test-results/reports/",
  reportName: "Playwright Automation Report",
  pageTitle: "BookCart App test report",
  displayDuration: false,
  metadata: {
    browser: {
      name: "chrome",
      version: "112",
    },
    device: deviceName,
    platform: {
      name: platformName,
      version: platformVersion,
    },
  },
  customData: {
    title: "Test Info",
    data: [
      { label: "Project", value: "Book Cart Application" },
      { label: "Release", value: "1.2.3" },
      { label: "Cycle", value: "Smoke-1" },
    ],
  },
});
