import { ITestCaseHookParameter, Status } from '@cucumber/cucumber';
import { webFixture, vars } from '@src/global';
import fs from 'fs-extra';

const scenarioCounter: Record<string, number> = {};

/**
 * Handles the teardown process for each scenario, including capturing artifacts
 * like screenshots, videos, and traces based on configuration settings.
 *
 * @param {ITestCaseHookParameter} param - The Cucumber hook parameter containing scenario details.
 */
export async function handleScenarioTeardown(
  this: { attach: (data: any, mediaType: string) => Promise<void> },
  { pickle, result }: ITestCaseHookParameter
) {
  if (globalThis.runType !== 'ui' && globalThis.runType !== 'mobile') return;

  const safeName = pickle.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  //   const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
  //   const folder = `test-results/scenarios/${safeName}_${timestamp}`;
  scenarioCounter[safeName] = (scenarioCounter[safeName] || 0) + 1;
  const iteration = scenarioCounter[safeName];
  const folder = `test-results/scenarios/${safeName}_run${iteration}`;
  fs.ensureDirSync(folder);

  const captureScreenshot =
    vars.getConfigValue('artifacts.screenshot') === 'true';
  const captureVideo = vars.getConfigValue('artifacts.video') === 'true';
  const captureTrace = vars.getConfigValue('artifacts.trace') === 'true';
  const onlyOnFailure =
    vars.getConfigValue('artifacts.onFailureOnly') === 'true';
  const onlyOnSuccess =
    vars.getConfigValue('artifacts.onSuccessOnly') === 'true';
  const isPassed = result?.status === Status.PASSED;
  const isFailed = result?.status === Status.FAILED;
  const shouldCapture =
    (!onlyOnFailure && !onlyOnSuccess) ||
    (onlyOnFailure && isFailed) ||
    (onlyOnSuccess && isPassed);

  if (shouldCapture) {
    if (captureScreenshot) {
      const img = await webFixture.getCurrentPage().screenshot({
        path: `${folder}/screenshot.png`,
        type: 'png',
      });
      await this.attach(img, 'image/png');
    }

    if (captureVideo) {
      const videoPath = await webFixture.getCurrentPage().video().path();
      await this.attach(fs.readFileSync(videoPath), 'video/webm');
    }

    if (captureTrace) {
      await webFixture
        .getContext()
        .tracing.stop({ path: `${folder}/trace.zip` });
      await this.attach(
        vars.replaceVariables(
          `<a href="https://trace.playwright.dev/?trace=${folder}/trace.zip">Trace</a>`
        ),
        'text/html'
      );
    } else {
      await webFixture.getContext().tracing.stop();
    }
  } else {
    await webFixture.getContext().tracing.stop();
  }
  //   await this.attach(`Resolved Step: TEST123`, 'text/plain');
  await webFixture.getCurrentPage().close();
  await webFixture.getContext().close();
}

let attachFn: ((data: any, mediaType: string) => Promise<void>) | undefined;

export function setAttachFn(
  fn: (data: any, mediaType: string) => Promise<void>
) {
  attachFn = fn;
}
