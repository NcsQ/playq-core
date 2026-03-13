/**
 * DEPRECATED: This module is no longer used.
 * 
 * The rerun orchestration functionality has been integrated into src/exec/runner.ts.
 * 
 * USE INSTEAD:
 *   npx playq test --rerun --env staging
 *   npx playq test --grep "test-name" --rerun --env staging
 * 
 * This unified approach combines initial test run + automatic failure detection + rerun + report merging
 * within the test runner itself, improving consistency and reducing code duplication.
 * 
 * For more details, see: docs/RETRY-RERUN-GUIDE.md
 */

console.error('❌ ERROR: rerunOrchestrator module is deprecated and no longer used.');
console.error('');
console.error('Rerun orchestration is now built into the test runner.');
console.error('Use: npx playq test --rerun --env <env>');
console.error('');
process.exit(1);

