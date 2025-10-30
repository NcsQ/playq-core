import { webFixture, logFixture } from '@src/global';

export async function handleScenarioSetup({ pickle }, isAuth: boolean) {
  const scenarioName = pickle.name + pickle.id;
  logFixture.init(scenarioName);
  logFixture.setLogger(logFixture.get());

  if (globalThis.runType !== 'ui') return;

  await webFixture.launchBrowser();
  await webFixture.newContext();

  await webFixture.getContext().tracing.start({
    name: scenarioName,
    title: pickle.name,
    sources: true,
    screenshots: true,
    snapshots: true,
  });

  await webFixture.newPage();
  console.log(
    `✅ Page set in Before hook for ${isAuth ? 'auth' : 'non-auth'} scenario`
  );
}
