import { vars } from '@src/global';

export async function attachResolvedStep(thisArg: any, template: string) {
  const resolved = vars.replaceVariables(template);
  await thisArg.attach(`🧾 Resolved Step: ${resolved}`, 'text/plain');
}

export function defineLoggedStep(pattern: string, implementation: Function) {
  return function (this: any, ...args: any[]) {
    const stepText = pattern.replace(/\{param\}/g, (_match, i) => `"${args[i]}"`);
    attachResolvedStep.call(this, stepText);
    return implementation.apply(this, args);
  };
}