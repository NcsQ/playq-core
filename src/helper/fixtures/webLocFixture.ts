// src/helper/loc/locatorResolver.ts
import { Page, Locator } from "@playwright/test";
import { vars, engines} from "@playq";
// import { smartAI} from "@extend/engines/smartAi/smartAiEngine";




export async function webLocResolver(
    type: string,
    selector: string,
    pageArg: Page,
    overridePattern?: string,
    timeout?: number,
    smartAiRefresh: 'before' | 'after' | '' = ''
  ): Promise<Locator> {
    console.log(`🔍 Resolving locator: ${selector}`);
    const page = pageArg
    const isPlaywrightPrefixed = selector.startsWith("xpath=") || selector.startsWith("xpath =") || selector.startsWith("css=") || selector.startsWith("css =");
    if (isPlaywrightPrefixed) {
      // const rawSelector = selector.replace(/^xpath=|^css=|^xpath =|^xpath=\\|^xpath =\\|^css =/, "");
      // Normalize escaped forward slashes first, then remove prefix
      const rawSelector = selector
        .replace(/^xpath=\\|^xpath =\\/, "xpath=") // normalize `xpath=\` to `xpath=`
        .replace(/^xpath=|^xpath =|^css=|^css =/, "") // remove the actual prefix
        .replace(/\\\//g, "/"); // replace escaped slashes with normal ones
      console.log("📍 Detected Playwright-prefixed selector. Returning raw locator.");
      return page.locator(rawSelector);
    }

    const isPlaywrightChainedPrefixed = selector.startsWith("chain=") || selector.startsWith("chain =");
    if (isPlaywrightChainedPrefixed) {
      const rawSelector = selector.replace(/^chain=|^chain =/, "");
      console.log("📍 Detected Playwright-prefixed chained selector. Returning raw locator.");
      return page.locator(rawSelector);
    }

    const isXPath =
      selector.trim().startsWith("//") || selector.trim().startsWith("(");
    const isCSS =
      selector.includes(">") ||
      selector.startsWith(".") ||
      selector.includes("#");
    const isChained = selector.includes(">>");
    const isResourceLocator = selector.startsWith("loc.");

    if ((isXPath || isCSS || isChained) && !isResourceLocator) {
      console.log("📍 Detected XPath/CSS/Chained. Returning locator directly.");
      return page.locator(selector);
    }

    if (isResourceLocator) {
      const parts = selector.split(".");
      if (parts.length < 3) {
        throw new Error(
          `❌ Invalid locator format: "${selector}". Expected format: loc.(ts|json).<page>.<field>`
        );
      }

      const [, locType, pageName, fieldName] = parts;
        if (selector.startsWith("loc.json.")) {
        const [, , fileName, pageName, fieldName] = selector.split(".");
        const jsonLocatorMap = await import(
          `@resources/locators/loc-json/${fileName}.json`
        );
        const pageObj = jsonLocatorMap?.[pageName];
        if (!pageObj)
          throw new Error(
            `❌ Page "${pageName}" not found in ${fileName}.json`
          );
        const locatorString = pageObj[fieldName];
        if (!locatorString)
          throw new Error(
            `❌ Field "${fieldName}" not found in ${fileName}.json[${pageName}]`
          );
        console.log(
          `🧩 Resolved locator string from loc.json.${fileName}.${pageName}.${fieldName} -> ${locatorString}`
        );
        return page.locator(await vars.replaceVariables(locatorString));
      }

      if (selector.startsWith("loc.ts.")) {
        const [, , fileName, pageName, fieldName] = selector.split(".");
        // First try globalThis.loc if available
        const globalLoc = (globalThis as any).loc;
        if (globalLoc?.[fileName]?.[pageName]?.[fieldName]) {
          // console.log(`✅ Found locator in globalThis.loc for loc.ts.${fileName}.${pageName}.${fieldName}`);
          return globalLoc[fileName][pageName][fieldName](page);
        }
      }

      if (selector.startsWith("loc.")) {
        const [, fileName, pageName, fieldName] = selector.split(".");
        
        // First try globalThis.loc if available
        const globalLoc = (globalThis as any).loc;
        if (globalLoc?.[fileName]?.[pageName]?.[fieldName]) {
          // console.log(`✅ Found locator in globalThis.loc for loc.ts.${fileName}.${pageName}.${fieldName}`);
          return globalLoc[fileName][pageName][fieldName](page);
        }
      }


      throw new Error(
        `❌ Unknown locator source type "${locType}". Use loc. or locator.`
      );
    }
   if (overridePattern && overridePattern.toLowerCase() === '-no-check-') {
      console.log("📍 '-no-check-' detected. Skipping locator resolution.");
      return undefined as any; // or even better, throw a custom signal or null to trigger fallback
    }
    
    //SmartAI
    const isSmartAiEnabled = String(vars.getConfigValue('smartAi.enable')).toLowerCase().trim() === 'true';
    if (isSmartAiEnabled) {
      const smartAiEngine = engines.smartAi;
      return await smartAiEngine(page, type, selector, smartAiRefresh);
    }
   
    // Fallback to locatorPattern (locPattern)
    const isPatternEnabled = String(vars.getConfigValue('patternIq.enable')).toLowerCase().trim() === 'true';
    console.log('PatternIQ enabled?', isPatternEnabled);
    if (isPatternEnabled) {
      const patternEngine = engines.patternIq;
      return await patternEngine(page, type, selector, overridePattern, timeout)
      // return isPatternEnabled
      //   ? await patternEngine(page,type, selector, overridePattern, timeout)
      //   : webFixture.getCurrentPage().locator(selector);
    }

    // Fallback to default locator
    return page.locator(selector);
  }

