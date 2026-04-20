import crypto from "crypto";

const ADJECTIVES = [
  "red", "blue", "green", "gold", "dark", "bright", "calm", "cool",
  "dry", "fast", "flat", "bold", "deep", "fair", "fond", "glad",
  "gray", "keen", "kind", "late", "lean", "long", "mild", "neat",
  "pale", "pink", "pure", "rare", "raw", "rich", "ripe", "safe",
  "slim", "slow", "soft", "tall", "thin", "warm", "wide", "wild",
];

const NOUNS = [
  "river", "cloud", "stone", "flame", "frost", "storm", "shade", "bloom",
  "ridge", "creek", "grove", "bluff", "cliff", "coast", "delta", "field",
  "glade", "knoll", "marsh", "ocean", "plain", "shore", "slope", "trail",
  "basin", "brook", "coral", "drift", "dune", "flint", "haven", "inlet",
  "lake", "mesa", "oasis", "peak", "reef", "shoal", "tide", "vale",
];

export function generateCode() {
  const hex = crypto.randomBytes(2).toString("hex"); // 4 hex chars
  const adj = ADJECTIVES[crypto.randomInt(ADJECTIVES.length)];
  const noun = NOUNS[crypto.randomInt(NOUNS.length)];
  return `${hex}-${adj}-${noun}`;
}
