import { vars, webLocResolver, webFixture, logFixture } from "@src/global";
import type { Locator, Page as page} from "@playwright/test";
import { Given, When, Then } from "@cucumber/cucumber";
import { warn } from "winston";
import * as webActions from '@src/helper/actions/webActions';

/**
 * Web: Click Button -field: {param} -options: TESTIGN COMMENTS
 */
Given("Web: Open browser -url: {param} -options: {param}", async function (url, options) {
  let page = webFixture.getCurrentPage();
  await webActions.openBrowser(page, url, options);
});

Given("Web: Navigate by path -relativePath: {param} -options: {param}", async function (relativePath, options) {
  let page = webFixture.getCurrentPage();
  await webActions.navigateByPath(page, relativePath, options);
});

Given("Web: Click button -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.clickButton(page, field, options);
});

Given("Web: Click link -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.clickLink(page, field, options);
});

Given("Web: Click radio button -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.clickRadioButton(page, field, options);
});

Given("Web: Click checkbox -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.clickCheckbox(page, field, options);
});

Given("Web: Mouseover on link -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.mouseoverOnLink(page, field, options);
});

Given("Web: Fill input -field: {param} -value: {param} -options: {param}", async function (field, value, options) {
  let page = webFixture.getCurrentPage();
  await webActions.input(page, field, value, options);
});

Given("Web: Fill -field: {param} -value: {param} -options: {param}", async function (field, value, options) {
  let page = webFixture.getCurrentPage();
  await webActions.fill(page, field, value, options);
});

Given("Web: Verify header -text: {param} -options: {param}",  async function (text, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyHeaderText(page, text, options);
  });

Given("Web: Verify page title -text: {param} -options: {param}", async function (text, options) {
    let page = webFixture.getCurrentPage();
    await webActions.verifyPageTitle(page, text, options);
  });

Given("Web: Wait for Input -field: {param} -state: {param} (enabled or disabled) -options: {param}",  async function (field, state, options) {
  let page = webFixture.getCurrentPage();
  await webActions.waitForInputState (page, field, state, options);
  });

Given("Web: Wait for Text at Location -field: {param} -text: {param} -options: {param}",  async function (field, expectedText, options) {
  let page = webFixture.getCurrentPage();
  await webActions.waitForTextAtLocation (page, field, expectedText, options);
  });  

Given("Web: Click tab -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.clickTab(page, field, options);
});

Given("Web: Select Dropdown -field: {param} -value: {param} -options: {param}", async function (field, value, options) {
  let page = webFixture.getCurrentPage();
  await webActions.selectDropdown(page, field, value, options);
});

Given("Web: Verify text on page -text: {param} -options: {param}", async function (text, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyTextOnPage(page, text, options);
});

Given("Web: Verify text at location -field: {param} -value: {param} -options: {param}", async function (field, expectedText, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyTextAtLocation(page, field, expectedText, options);
});

Given("Web: Verify input field is present -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyInputFieldPresent(page, field, options);
});

Given("Web: Verify input field value -field: {param} -value: {param} -options: {param}", async function (field, expectedValue, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyInputFieldValue(page, field, expectedValue, options);
});

Given("Web: Verify Tab field Present -field: {param} -options: {param}", async function (field, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyTabField(page, field, options);
});

Given("Web: Verify toast text contains -text: {param} -options: {param}", async function (text, options) {
  let page = webFixture.getCurrentPage();
  await webActions.verifyToastTextContains(page, text, options);
});

Given("Web: Wait for URL -url: {param} -options: {param}", async function (url, options) {
  let page = webFixture.getCurrentPage();
  await webActions.waitForUrl(page, url, options);
});  

Given("Web: Press Key -key: {param} -options: {param}", async function (key, options) {
  let page = webFixture.getCurrentPage();
  await webActions.pressKey(page, key, options);
});