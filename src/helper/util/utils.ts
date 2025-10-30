// Utilities for Test Automation

function toCamelCase(input: string): string {
  // Remove all non-alphanumeric characters except spaces
  const cleaned = input.replace(/[^a-zA-Z0-9 ]/g, " ");

  // Split by whitespace, lowercase first word, capitalize others
  const words = cleaned.trim().split(/\s+/);

  if (words.length === 0) return "";

  let camelCase =
    words[0].toLowerCase() +
    words
      .slice(1)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("");

  // Ensure it doesn't start with a digit
  if (/^[0-9]/.test(camelCase)) {
    camelCase = "_" + camelCase;
  }

  return camelCase;
}


export { toCamelCase};
