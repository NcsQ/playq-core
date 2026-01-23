import { Given, When, Then } from "@cucumber/cucumber";

Given("Step Group: {param} {param}", async function (stepGroupName, stepGroupDesc) {
  console.error(`❌ Step Group not available: ${stepGroupName} | ${stepGroupDesc}`);
});

Given("- Step Group - START: {param} Desc: {param}", async function (stepGroupName, stepGroupDesc) {
  console.log(`-> Step Group [START]: ${stepGroupName} | ${stepGroupDesc}`);
});

Given("- Step Group - END: {string}", async function (stepGroupName) {
  console.log(`-> Step Group [END]: ${stepGroupName}`);
});

Given("Step Group: tests", async function (stepGroupName, stepGroupDesc) {
  console.error(`❌ Step Group not available: ${stepGroupName} | ${stepGroupDesc}`);
});