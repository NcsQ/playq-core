import { Given, When, Then } from "@cucumber/cucumber";
import { warn } from "winston";
import { comm } from "@src/global";

Given("Comm: Wait-In-Milli-Seconds -seconds: {param}", async function (seconds) {
  await comm.waitInMilliSeconds(parseInt(seconds));
});

Given("Comm: Comment -text: {param}", async function (comment) {
  await comm.comment(comment);
});

Given("Comm: Encrypt-Password -text: {param} -options: {param}", async function (encryptedText, options) {
  await comm.encryptPassword(encryptedText, options);
});

Given("Comm: Encrypt-Text -text: {param} -options: {param}", async function (encryptedText, options) {
  await comm.encryptText(encryptedText, options);
});

Given("Comm: Encrypt-Password -text: {param} and store in -variable: {param} -options: {param}", async function (textToEncrypt, varToStore, options) {
  await comm.encryptPasswordAndStore(textToEncrypt, varToStore, options);
});

Given("Comm: Encrypt -text: {param} and store in -variable: {param} -options: {param}", async function (textToEncrypt, varToStore, options) {
  console.log('Text to encrypt:', textToEncrypt);
  await comm.encryptTextAndStore(textToEncrypt, varToStore, options);
});

Given("Comm: Decrypt -text: {param} and store in -variable: {param} -options: {param}", async function (encryptedText, varName, options) {
  await comm.decrypt(encryptedText, varName, options);
});

Given("Comm: Get-Random-From-List -arrayList: {param}", async function (list) {
  const arrayList = JSON.parse(list);
  await comm.getRandomFromList(arrayList);
});

Given("Comm: Remove-Leading-Zero-From-Date -text: {param}", async function (dateText) {
  await comm.removeLeadingZeroFromMonthAndDate(dateText);
});

Given("Comm: Write-JSON-To-File -filePath: {param} -data: {param} -options: {param}", async function (filePath, data, options) {
  await comm.writeJsonToFile(filePath, data, options);
});

Given("Comm: Attach-Log -message: {param} -mimeType: {param} -msgType: {param}", async function (message, mimeType, msgType) {
  await comm.attachLog(message, mimeType, msgType);
});

Given("Store -value: {param} in -variable: {param} -options: {param}", async function (value, varName, options) {
  await comm.storeValue(value, varName, options);
});