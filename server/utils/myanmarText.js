const Rabbit = require("rabbit-node");

// Lightweight heuristic to detect likely Zawgyi (no native deps)
function isLikelyZawgyi(text) {
  if (!text) return false;
  // Zawgyi-specific code points commonly appear in \u106A-\u109F range
  if (/[\u106A-\u109F]/.test(text)) return true;
  // Common Zawgyi ordering: E vowel (1031) before head consonant or Ya (103B)
  if (/\u1031[\u1000-\u1021]/.test(text)) return true;
  if (/\u1031\u103B/.test(text)) return true;
  // Dense stacked medials more typical in Zawgyi
  if (/[\u103A\u103B\u103C\u103D\u103E]{2,}/.test(text)) return true;
  return false;
}

/**
 * Normalize Myanmar text to standard Unicode.
 * - Uses a heuristic to detect Zawgyi and converts using Rabbit.
 * - Returns input unchanged for non-text or empty values.
 * @param {string} input
 * @returns {string}
 */
function normalizeMyanmarText(input) {
  if (typeof input !== "string") return input;
  const text = input.trim();
  if (!text) return text;

  try {
    if (isLikelyZawgyi(text)) {
      return Rabbit.zg2uni(text);
    }
    return text;
  } catch (_) {
    return text;
  }
}

module.exports = { normalizeMyanmarText };


