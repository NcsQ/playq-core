import { chromium, firefox, webkit } from "playwright";
import type { LaunchOptions } from "playwright";
import * as vars from "../bundle/vars";

const options: LaunchOptions = {
    headless: !true
}
export const invokeBrowser = () => {
    const browserType = vars.getConfigValue('browser.browserType') || "chromium";
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