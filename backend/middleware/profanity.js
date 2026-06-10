const PROFANITY_WORDS = new Set([
  // English - general insults
  "fuck", "fucker", "fucking", "shit", "shithead", "bullshit", "bitch", "bastard",
  "asshole", "damnit", "pissed", "dickhead", "cockhead", "prick", "slut", "whore",
  "nigger", "nigga", "cunt", "twat", "wanker", "motherfucker", "son of a bitch",

  // French - general insults
  "putain", "pute", "connard", "connasse", "enculé", "enculée", "foutre", "foutu",
  "merde", "bordel", "salope", "salaud", "bâtard", "grosse conne", "fils de pute",
  "nique ta mere", "va te faire foutre", "va te faire enculer", "trou du cul",
  "encule de ta race", "enculé de ta race",

  // French - homophobic slurs (keep actual slurs only)
  "pédé", "pédale", "tapette", "gouine", "tarlouze", "enculé", "travelo",

  // French - racial slurs
  "bougnoule", "bougoule", "raton", "bicot",

  // Malagasy
  "fory", "bibity", "bobota", "kimaso", "kindinalika", "masosopory",
  "lindinakika", "tay amin'amany", "manemany", "lataka", "tingy",

  // Harmful directives
  "kill yourself", "kys", "kill urself", "go kill yourself", "go die", "death to",

  // Hate ideologies
  "white supremacy", "white power", "kkk",
]);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsProfanity(text) {
  if (!text) return false;

  const normalized = text
    .toLowerCase()
    .replace(/[0-9@!$]+/g, (m) => {
      const map = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "!": "i", "$": "s", "@": "a" };
      return m.split("").map((c) => map[c] || c).join("");
    })
    .replace(/\s+/g, " ")
    .trim();

  for (const word of PROFANITY_WORDS) {
    const wordRegex = new RegExp("\\b" + escapeRegex(word.toLowerCase()) + "\\b");
    if (wordRegex.test(normalized)) return true;
  }

  return false;
}

function filterProfanity(text, replacement = "*") {
  if (!text) return text;

  let result = text;

  const sortedWords = [...PROFANITY_WORDS].sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    const regex = new RegExp("\\b" + escapeRegex(word) + "\\b", "gi");
    result = result.replace(regex, replacement.repeat(word.length));
  }

  return result;
}

module.exports = { containsProfanity, filterProfanity };
