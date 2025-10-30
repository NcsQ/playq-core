import { defineParameterType } from '@cucumber/cucumber';
import { vars,faker} from '@src/global';

defineParameterType({
  name: 'param',
  regexp: /".*?"/,
  transformer(this: any, input: string) {
    let raw = input.replace(/^"|"$/g, '').trim();
    let resolved = raw;
    // If input is wrapped in ${...}, unwrap it for faker expressions
    if (/^\#\{faker(\.[a-zA-Z0-9_]+)+\([^)]*\)\}$/.test(raw)) {
      raw = raw.slice(2, -1); // Remove ${ and }
      resolved = raw;
    }
  
    if (/^faker(\.[a-zA-Z0-9_]+)+\([^)]*\)$/.test(resolved)) {
      try {
        // Extract function path and arguments
        // const funcMatch = resolved.match(/^faker((?:\.[a-zA-Z0-9_]+)+)\(([^)]*)\)$/);
        const funcMatch = resolved.match(/^faker((?:\.[a-zA-Z0-9_]+)+)\((.*)\)$/);
        if (!funcMatch) throw new Error(`❌ Invalid faker expression: ${resolved}`);

        const path = funcMatch[1].substring(1); // remove leading dot
        const argsRaw = funcMatch[2];

        console.log("📦 Faker Call Match:", { path, argsRaw });

        if (argsRaw.includes("{") && !argsRaw.includes("}")) {
          throw new Error(`❌ Unmatched braces in argument: ${argsRaw}`);
        }

        // Resolve the path to the function
        const parts = path.split('.');
        let current: any = globalThis.faker;
        for (const part of parts) {
          current = current?.[part];
        }

        // Evaluate the function if it exists
        if (typeof current === 'function') {
          let args: any[] = [];
          if (argsRaw.trim().startsWith("{")) {
            // Argument is an object literal, attempt to parse as JSON
            try {
              const normalized = argsRaw
                .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":') // quote unquoted keys
                .replace(/'/g, '"'); // single to double quotes
              args = [JSON.parse(normalized)];
            } catch (e) {
              throw new Error(`❌ Failed to parse faker argument object: ${argsRaw}`);
            }
          } else {
            args = argsRaw.length
              ? argsRaw.split(',').map(a => a.trim().replace(/^["']|["']$/g, ''))
              : [];
          }
          resolved = current(...args);
        } else {
          throw new Error(`❌ Resolved path is not a function: ${resolved}`);
        }
      } catch (err) {
        console.error(`❌ Failed to evaluate dynamic faker: ${resolved}`, err);
        throw err;
      }
    } else {
      resolved = vars.replaceVariables(raw);
    }

    if (resolved !== raw && typeof this?.attach === 'function') {
      if (raw.includes('pwd.')) {
        this.attach(`Replaced: |${input}|-with-|***********|`, 'text/plain');
      } else {
      this.attach(`Replaced: |${input}|-with-|${resolved}|`, 'text/plain');
      }
    }

    return resolved;
  }
});