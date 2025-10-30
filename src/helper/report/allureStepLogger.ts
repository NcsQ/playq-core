// src/helper/report/allureStepLogger.ts
// import { step, attachment, owner, issue } from 'allure-js-commons';
// import { isCucumberRunner } from '@config/runner';
// import { webFixture } from '@helper/fixtures/webFixture';

// /**
//  * Logs a step to Allure or attaches it in Cucumber world.
//  * 
//  * @param stepName Description of the step
//  * @param stepFn Function to execute within the step
//  */
// export async function logStep(stepName: string, stepFn: () => Promise<void>) {
//   if (isCucumberRunner()) {
//     const world = webFixture.getWorld();
//     try {
//       await world.attach(`🟡 Step: ${stepName}`, 'text/plain');
//       await stepFn();
//       await world.attach(`✅ Passed: ${stepName}`, 'text/plain');
//     } catch (err: any) {
//       await world.attach(`❌ Failed: ${stepName} - ${err.message}`, 'text/plain');
//       throw err;
//     }
//   } else {
//     await allure.step(stepName, stepFn);
//   }
// }