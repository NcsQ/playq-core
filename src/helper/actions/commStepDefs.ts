import { Given, When, Then } from "@cucumber/cucumber";
import { warn } from "winston";
import { comm } from "../../global";

// commonActions.ts

Given("Comm: Wait for milliseconds -seconds: {param}", async function (seconds) {
  await comm.waitInMilliSeconds(parseInt(seconds));
});

Given("Comm: Comment -text: {param}", async function (comment) {
  await comm.comment(comment);
});

Given("Comm: Encrypt password -text: {param} -options: {param}", async function (encryptedText, options) {
  await comm.encryptPassword(encryptedText, options);
});

Given("Comm: Encrypt text -text: {param} -options: {param}", async function (encryptedText, options) {
  await comm.encryptText(encryptedText, options);
});

Given("Comm: Encrypt password -text: {param} and store in -variable: {param} -options: {param}", async function (textToEncrypt, varToStore, options) {
  await comm.encryptPasswordAndStore(textToEncrypt, varToStore, options);
});

Given("Comm: Encrypt text -text: {param} and store in -variable: {param} -options: {param}", async function (textToEncrypt, varToStore, options) {
  console.log('Text to encrypt:', textToEncrypt);
  await comm.encryptTextAndStore(textToEncrypt, varToStore, options);
});

Given("Comm: Decrypt -text: {param} and store in -variable: {param} -options: {param}", async function (encryptedText, varName, options) {
  await comm.decrypt(encryptedText, varName, options);
});

Given("Comm: Get random from list -arrayList: {param}", async function (list) {
  const arrayList = JSON.parse(list);
  await comm.getRandomFromList(arrayList);
});

Given("Comm: Remove leading zero from date -text: {param}", async function (dateText) {
  await comm.removeLeadingZeroFromMonthAndDate(dateText);
});

Given("Comm: Write JSON to file -filePath: {param} -data: {param} -options: {param}", async function (filePath, data, options) {
  await comm.writeJsonToFile(filePath, data, options);
});

Given("Comm: Attach log -message: {param} -mimeType: {param} -msgType: {param}", async function (message, mimeType, msgType) {
  await comm.attachLog(message, mimeType, msgType);
});

Given("Comm: Store -value: {param} in -variable: {param} -options: {param}", async function (value, varName, options) {
  await comm.storeValue(value, varName, options);
});

// utilityActions.ts
Given("Comm: To Dollar Amount -value: {param}", async function (value) {
  const formatted = await comm.toDollarAmount(Number(value));
  await comm.attachLog(`Formatted dollars: ${formatted}`, 'text/plain', 'COMM');
});

// TOTP token generation
Given("Comm: Generate TOTP Token to variable -varName: {param} -options: {param}", async function (varName, options) {
  await comm.generateTotpTokenToVariable(varName, options);
});

// utilityActions.ts (alias wait)
Given("Comm: Wait -ms: {param}", async function (ms) {
  const value = parseInt(String(ms));
  await comm.wait(value);
});