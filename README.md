# @playq/core (Alpha)

Unified Playwright + Cucumber test runner and engine registry.

## Quick Start
```bash
npm install @playq/core @playwright/test @cucumber/cucumber --save-dev
npx playq util versions
npx playq test               # runs Playwright specs by default
npx playq test --cucumber    # runs Cucumber features
```

## Config Resolution
Looks for `playq.config.(js|cjs|mjs|json)` in project root, merges with internal defaults, then applies env overrides like:
```
PLAYQ__browser__browserType=firefox
PLAYQ__testExecution__parallel=true
```

## CLI Commands
- `playq test [--cucumber] [--parallel N] [--grep pattern] [--tags expr]`
- `playq util versions`
- `playq report allure --open` (placeholder)
- `playq init` (placeholder)

## Engine API
```ts
import { registerEngine } from '@playq/core';
registerEngine({ id: 'myEngine', init: async () => {/*...*/} });
```

## Environment Overrides
Prefixed with `PLAYQ__` and mapped by `__` segments to nested config keys.

## Roadmap
- Implement real init scaffolder
- Add allure integration
- External engine auto-discovery
- Hook system exposure

Alpha: APIs may change.
