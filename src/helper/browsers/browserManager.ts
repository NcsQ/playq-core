import { LaunchOptions, chromium, firefox, webkit } from "@playwright/test";
import { config, vars } from "@playq";

const options: LaunchOptions = {
    headless: !true
}
export const invokeBrowser = () => {
    const browserType = config?.browser?.browserType || vars.getConfigValue('browser.browserType') || "chromium";
    switch (browserType) {
        case "chromium":
            return chromium.launch(options);
        case "firefox":
            return firefox.launch(options);
        case "webkit":
            return webkit.launch(options);
        default:
            throw new Error("Please set the proper browser!")
    }

}