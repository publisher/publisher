// @flow

const shuffle = require("array-shuffle");

function getRandomId(existingIds /*: Set<string> */ = new Set()) {
  const shuffledAdjectives = shuffle(adjectives);
  const shuffledNouns = shuffle(nouns);

  let adjIndex = 0;
  let nounIndex = 0;
  while (adjIndex < adjectives.length && nounIndex < nouns.length) {
    const adj = shuffledAdjectives[adjIndex];
    const noun = shuffledNouns[nounIndex];
    const id = `${adj}-${noun}`;
    if (!existingIds.has(id)) {
      return id;
    }
    if (++adjIndex === adjectives.length) {
      adjIndex = 0;
      nounIndex++;
    }
  }
  throw new Error("No unique id");
}

module.exports = getRandomId;

// prettier-ignore
const adjectives = [
  "aged", "ancient", "astonishing", "autumn", "bewildered", "billowing",
  "bitter", "blue", "bold", "bored", "brainy", "brave", "bright", "broken",
  "calm", "capricious", "careful", "cheerful", "clever", "cold", "cool",
  "coordinated", "crimson", "curated", "curious", "curly", "damp", "dapper",
  "dark", "dawn", "dazzling", "deep", "delicate", "delightful", "determined",
  "divine", "dry", "elegant", "empty", "enchanted", "energetic", "enthusiastic",
  "exuberant", "fabulous", "falling", "famous", "fancy", "festive", "fierce",
  "flat", "floral", "fragrant", "fresh", "frosty", "gaudy", "gentle",
  "gleaming", "glorious", "green", "happy", "hidden", "honorable", "humble",
  "icy", "jolly", "late", "lingering", "little", "lively", "long", "lucky",
  "magnificent", "majestic", "marvelous", "mighty", "misty", "morning", "muddy",
  "mysterious", "nameless", "neat", "noisy", "oblivious",  "old", "orange",
  "patient", "plain", "polished", "polite", "proud", "purple", "quick", "quiet",
  "rapid", "restless", "rough", "round", "royal", "shiny", "shrill", "shy",
  "silent", "small", "snowy", "soft", "solitary", "sour", "sparkling", "spiffy",
  "spring", "square", "steep", "still", "strong", "summer", "super", "sweet",
  "swift", "thundering", "tidy", "twilight", "upbeat", "vivid", "wandering",
  "weathered", "whimsical", "wild", "winter", "windy", "wispy", "withered",
  "worried", "young",
];

// prettier-ignore
const nouns = [
  "art", "band", "bar", "base", "bird", "block", "boat", "bonus", "bread",
  "breeze", "brook", "butterfly", "cake",  "cloud", "credit", "darkness",
  "dawn", "dew", "disk", "dream", "dust", "feather", "field", "fire", "firefly",
  "flower", "fog", "forest", "frog", "frost", "glade", "glitter", "grass",
  "hall", "hat", "haze", "heart", "hill", "lab", "lake", "leaf", "limit",
  "math", "meadow", "mode", "moon", "morning", "mountain", "mouse", "mud",
  "night", "paper", "pine", "poetry", "pond", "rain", "recipe", "resonance",
  "rice", "river", "salad", "scene", "sea", "shadow", "shape", "silence", "sky",
  "smoke", "snow", "snowflake", "sound", "star", "sun", "sun", "sunset", "surf",
  "term", "thunder", "tooth", "tree", "truth", "union", "unit", "violet",
  "voice", "water", "waterfall", "wave", "wildflower", "wind",
];
