const PROFANITY_WORDS = new Set([
  // English - general insults
  "fuck", "fucker", "fucking", "shit", "shithead", "bullshit", "bitch", "bastard",
  "asshole", "ass", "damn", "damnit", "piss", "pissed", "crap", "dick", "dickhead",
  "cock", "cockhead", "prick", "slut", "whore", "nigger", "nigga", "cunt", "twat",
  "wanker", "motherfucker", "mf", "mf'er", "s.o.b", "son of a bitch", "sonofabitch",

  // English - homophobic / transphobic
  "faggot", "fag", "dyke", "tranny", "trannie", "homo", "queer", "sissy",
  "bender", "pansy", "fairy", "fruitcake", "fruit", "ladyboy", "shemale",
  "he-she", "it", "transvestite", "breasticle", "man-hater", "manhater",

  // English - racial
  "wetback", "spic", "chink", "gook", "kike", "raghead", "towelhead",
  "jungle bunny", "junglebunny", "coon", "darky", "darkie", "honky", "cracker",
  "gringo", "gypsy", "paki", "pikey",

  // French - general insults
  "putain", "pute", "connard", "connasse", "encule", "enculer", "enculé", "enculée",
  "foutre", "foutu", "merde", "bordel", "salope", "salaud", "batard", "bâtard",
  "con", "conne", "cul", "bite", "couille", "couilles", "nique", "niquer",
  "ta gueule", "tg", "ferme ta gueule", "va te faire foutre", "va te faire enculer",
  "fils de pute", "filsdepute", "fdp", "ntm", "nique ta mere", "ntm",
  "abruti", "abrutie", "debile", "débile", "imbecile", "imbécile", "crétin", "cretin",
  "trou du cul", "trouduc", "trou de cul", "encule de ta race", "enculé de ta race",
  "gros con", "grosse conne", "va te faire", "casse-toi", "barre-toi",

  // French - homophobic / transphobic
  "pédé", "pede", "pédale", "pedale", "tapette", "gouine", "tarlouze",
  "folle", "fiotte", "fiotte", "enculé", "encule", "pd", "ptdr",
  "travelo", "trans", "homosexuel", "lesbienne",

  // French - racial
  "bougnoule", "bougoule", "renoi", "renoi", "bougnoul", "raton",
  "bic", "bicot", "boug", "singe", "gorille", "caca",

  // Malagasy - general insults
  "adala", "adala be", "hadala", "bado", "badoa", "tsy misy dikany",
  "mpangalatra", "mpamadika", "mpisoloky", "mpitaka", "mpiray tsikombakomba",
  "jirama", "jirama be", "tsy mahay", "tsy manaja", "tsy manetry tena",
  "mpandala", "mpamono", "mpamono olona", "mpamono vady", "mpamono fianakaviana",
  "mpivaro-tena", "mpivarotra tena", "mpivaro-tena", "mpivaro tena",
  "mpitondra ratsy", "mpitondra ratsy fanahy", "mpitondra ratsy saina",

  // Malagasy - homophobic / transphobic
  "pelaka", "pelaka be", "sailava", "sailava be", "mbola", "mbola be",
  "vazaha", "vazaha be", "tsy lehilahy", "tsy vehivavy", "lehilahy tsy lehilahy",
  "vehivavy tsy vehivavy", "sarongady", "sarongady be", "mpifankatia mitovy fananahana",

  // Malagasy - other offensive
  "mpanao ratsy", "mpanao heloka", "mpanao heloka bevava", "mpamono",
  "mpamono olona", "mpamono vady", "mpamono fianakaviana", "mpamono ankizy",
  "mpivaro-tena", "mpivarotra tena", "mpivaro tena", "mpitondra ratsy",
  "mpitondra ratsy fanahy", "mpitondra ratsy saina", "mpitondra ratsy fo",
  "mpitondra ratsy fanahy", "mpitondra ratsy saina", "mpitondra ratsy fo",

  // Slurs / hate speech (cross-language)
  "kill yourself", "kys", "kill urself", "kill yourself", "go die", "go kill yourself",
  "die", "death to", "hate", "racist", "sexist", "homophobic", "transphobic",
  "nazi", "hitler", "kkk", "white supremacy", "white power", "black lives don't matter",
  "blm", "all lives matter", "white lives matter",

  // Leetspeak / common obfuscations
  "f4ck", "fck", "fuk", "fckr", "fckng", "sh1t", "sh!t", "b1tch", "b!tch",
  "a$$", "a55", "d1ck", "d!ck", "c0ck", "c!ck", "cunt", "cunt",
  "p3d3", "p3d", "péd3", "ped3", "t@pette", "tap3tte", "g0uine", "gouin3",
  "ad@l@", "adal@", "ad@la", "b@d0", "bad0", "pel@k@", "pelaka",
]);

const PROFANITY_PATTERNS = [
  /\bf[u4@]+c[k]+/gi,
  /\bs[h5]+[i1!]+t\b/gi,
  /\bb[i1!]+t[c]+h\b/gi,
  /\ba[s$]+[h]+o+l+e\b/gi,
  /\bm[o0]+t+h+e+r+f[u4@]+c[k]+\b/gi,
  /\bn[i1!]+g+[e3]+r\b/gi,
  /\bn[i1!]+g+[a4]+\b/gi,
  /\bc[u]+n+t\b/gi,
  /\bd[i1!]+c+k+h+e+a+d\b/gi,
  /\bc[o0]+c+k+h+e+a+d\b/gi,
  /\bf[a4@]+g[g]+o+t\b/gi,
  /\bf[a4@]+g\b/gi,
  /\bp[u]+t+a+i+n\b/gi,
  /\bp[u]+t[e3]+\b/gi,
  /\bc[o0]+n+n+a+r+d\b/gi,
  /\bc[o0]+n+n+a+s+s+e\b/gi,
  /\bm[e3]+r+d+e\b/gi,
  /\bs+a+l+o+p+e\b/gi,
  /\bs+a+l+a+u+d\b/gi,
  /\bp+é+d+é\b/gi,
  /\bp+e+d+é\b/gi,
  /\bp+e+d+e\b/gi,
  /\bt+a+p+e+t+t+e\b/gi,
  /\bg+o+u+i+n+e\b/gi,
  /\bt+a+r+l+o+u+z+e\b/gi,
  /\bp+e+l+a+k+a\b/gi,
  /\bs+a+i+l+a+v+a\b/gi,
  /\ba+d+a+l+a\b/gi,
  /\bb+a+d+o\b/gi,
];

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
    if (normalized.includes(word.toLowerCase())) return true;
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) return true;
  }

  return false;
}

function filterProfanity(text, replacement = "*") {
  if (!text) return text;

  let result = text;

  const sortedWords = [...PROFANITY_WORDS].sort((a, b) => b.length - a.length);
  for (const word of sortedWords) {
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    result = result.replace(regex, replacement.repeat(word.length));
  }

  return result;
}

module.exports = { containsProfanity, filterProfanity, PROFANITY_WORDS };
