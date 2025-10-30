import { test as base, expect } from '@playwright/test';
import '@src/config/playwright/playwright.hooks'; // Your hooks (beforeAll, beforeEach, etc.)

export { base as test, expect };