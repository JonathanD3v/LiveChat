const Rabbit = require("rabbit-node");

function isLikelyZawgyi(text) {
  if (!text) return false;

  // Only Zawgyi-specific code points that don't exist in standard Unicode
  // 0x1060–0x109F and some medials
  return /[\u1060-\u1097]/.test(text);
}

function normalizeMyanmarText(input) {
  if (typeof input !== "string") return input;
  const text = input.trim();
  if (!text) return text;

  try {
    if (isLikelyZawgyi(text)) {
      return Rabbit.zg2uni(text);
    }
    return text; // already Unicode
  } catch {
    return text;
  }
}

module.exports = { normalizeMyanmarText };
