/**
 * Validates if a numeric ID matches a given pattern.
 * 
 * Pattern rules:
 * - Same letter = same digit (e.g., AA means both digits are equal)
 * - Different letter = different digit (e.g., AB means digits differ)
 * - X = wildcard, any digit, no constraints
 * 
 * Example: AAAABCD matches 1111234, 7777856, etc.
 */
export function matchesPattern(id: string, pattern: string): boolean {
  if (id.length !== pattern.length) return false;

  // Map from pattern letter -> digit it's bound to
  const letterToDigit: Record<string, string> = {};
  // Map from digit -> pattern letter it's bound to (reverse)
  const digitToLetter: Record<string, string> = {};

  for (let i = 0; i < pattern.length; i++) {
    const letter = pattern[i];
    const digit = id[i];

    // X is wildcard — skip all constraints
    if (letter === "X") continue;

    if (letter in letterToDigit) {
      // This letter was already mapped — digit must match
      if (letterToDigit[letter] !== digit) return false;
    } else {
      // New letter — check digit isn't already bound to a different letter
      if (digit in digitToLetter && digitToLetter[digit] !== letter) {
        return false;
      }
      letterToDigit[letter] = digit;
      digitToLetter[digit] = letter;
    }
  }

  return true;
}

/**
 * Check if an ID matches ANY of the allowed patterns for the given level ranges.
 * Returns true if at least one pattern matches.
 */
export function validateIdAgainstPatterns(
  id: string,
  patterns: string[]
): boolean {
  return patterns.some((pattern) => matchesPattern(id, pattern));
}
