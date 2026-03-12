/**
 * RERUN WORKFLOW
 * 
 * PlayQ uses a MANUAL-ONLY rerun approach:
 * 
 * 1. NORMAL TEST RUN:
 *    npx playq test --grep "login"
 *    - Tests execute
 *    - If failures detected: saves failure info to .playq-failed-tests.json
 *    - Exits with non-zero code
 *    - Does NOT automatically rerun
 * 
 * 2. MANUAL RERUN (User choice):
 *    User can then manually rerun failed tests by:
 *    npx playq test --grep "login"   (run entire suite again)
 *    OR
 *    npx playq test --grep "specific-failed-test"
 * 
 * DESIGN PRINCIPLE: Reruns must be explicit and manual, not automatic.
 * This gives users full control over when and what gets rerun.
 * 
 * SAVED FAILURE FILES:
 * - .playq-failed-tests.json: Metadata about failed tests
 * - @rerun.txt: Cucumber rerun file (for direct cucumber-js invocation)
 * - .playwright-rerun: Playwright rerun file (for direct playwright invocation)
 * 
 * These files can be manually examined to understand what failed.
 */

console.error('❌ ERROR: Manual rerun - read failure info from .playq-failed-tests.json');
console.error('');
console.error('WORKFLOW:');
console.error('1. Run tests: npx playq test --grep "<pattern>"');
console.error('2. Review failures in: .playq-failed-tests.json');
console.error('3. Manually rerun: npx playq test --grep "<pattern>"');
console.error('');
console.error('PlayQ uses MANUAL-ONLY reruns (not automatic) for full control.');
console.error('');
process.exit(1);

