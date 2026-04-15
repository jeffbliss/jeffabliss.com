export const NICE_NUMBERS = [69, 420, 690, 6969, 42069, 69420];

export const NICE_SUBSTRINGS = ["69"];

export const MAX_LEVEL = 100;

export const CATEGORY_CONFIG = [
  { id: "lodestoneId", name: "Lodestone ID", maxScore: 50 },
  { id: "jobsAt69", name: "Jobs at Level 69", maxScore: 69 },
  { id: "minionPercent", name: "Minion Collection %", maxScore: 30 },
  { id: "mountPercent", name: "Mount Collection %", maxScore: 30 },
  { id: "achievementPoints", name: "Achievement Points", maxScore: 35 },
  { id: "activeJobLevel", name: "Active Job Level", maxScore: 42 },
  { id: "nameNiceometry", name: "Name Nice-ometry", maxScore: 20 },
  { id: "maxedJobCount", name: "Maxed Job Count", maxScore: 20 },
  { id: "avgJobLevel", name: "Average Job Level", maxScore: 20 },
  { id: "gearStats", name: "Gear Stat Sniffing", maxScore: 40 },
  { id: "bioNiceometry", name: "Bio Nice-ometry", maxScore: 24 },
  { id: "fcNiceness", name: "FC Niceness", maxScore: 25 },
  { id: "namedayDeity", name: "Nameday & Deity", maxScore: 15 },
];

export const TIER_THRESHOLDS = [
  { name: "LEGENDARY", min: 0.9 },
  { name: "NICE", min: 0.6 },
  { name: "CLOSE", min: 0.3 },
  { name: "MEH", min: 0.01 },
  { name: "SAD", min: 0 },
];

export const TIER_COLORS = {
  LEGENDARY: "#ffaa00",
  NICE: "#bb86fc",
  CLOSE: "#4fc3f7",
  MEH: "#555",
  SAD: "#333",
};

export const OVERALL_TIERS = [
  {
    name: "TRANSCENDENT NICE",
    min: 350,
    max: 420,
    label: "TRANSCENDENT NICE",
    tagline: "You are the chosen one",
  },
  {
    name: "CERTIFIED NICE",
    min: 200,
    max: 349,
    label: "CERTIFIED NICE",
    tagline: "The community respects your commitment",
  },
  {
    name: "KINDA NICE",
    min: 100,
    max: 199,
    label: "KINDA NICE",
    tagline: "You've got the spirit",
  },
  {
    name: "NEEDS WORK",
    min: 1,
    max: 99,
    label: "NEEDS WORK",
    tagline: "Your nice game is weak",
  },
  {
    name: "CERTIFIED UN-NICE",
    min: 0,
    max: 0,
    label: "CERTIFIED UN-NICE",
    tagline: "Not a single 69 in sight. Shameful.",
  },
];

export const FFXIV_SERVERS = [
  {
    region: "NA",
    dc: "Aether",
    servers: [
      "Adamantoise",
      "Cactuar",
      "Faerie",
      "Gilgamesh",
      "Jenova",
      "Midgardsormr",
      "Sargatanas",
      "Siren",
    ],
  },
  {
    region: "NA",
    dc: "Crystal",
    servers: [
      "Balmung",
      "Brynhildr",
      "Coeurl",
      "Diabolos",
      "Goblin",
      "Malboro",
      "Mateus",
      "Zalera",
    ],
  },
  {
    region: "NA",
    dc: "Primal",
    servers: [
      "Behemoth",
      "Excalibur",
      "Exodus",
      "Famfrit",
      "Hyperion",
      "Lamia",
      "Leviathan",
      "Ultros",
    ],
  },
  {
    region: "NA",
    dc: "Dynamis",
    servers: [
      "Halicarnassus",
      "Maduin",
      "Marilith",
      "Seraph",
      "Rafflesia",
      "Golem",
    ],
  },
  {
    region: "EU",
    dc: "Chaos",
    servers: [
      "Cerberus",
      "Louisoix",
      "Moogle",
      "Omega",
      "Phantom",
      "Ragnarok",
      "Sagittarius",
      "Spriggan",
    ],
  },
  {
    region: "EU",
    dc: "Light",
    servers: [
      "Alpha",
      "Lich",
      "Odin",
      "Phoenix",
      "Raiden",
      "Shiva",
      "Twintania",
      "Zodiark",
    ],
  },
  {
    region: "JP",
    dc: "Elemental",
    servers: [
      "Aegis",
      "Atomos",
      "Carbuncle",
      "Garuda",
      "Gungnir",
      "Kujata",
      "Tonberry",
      "Typhon",
    ],
  },
  {
    region: "JP",
    dc: "Gaia",
    servers: [
      "Alexander",
      "Bahamut",
      "Durandal",
      "Fenrir",
      "Ifrit",
      "Ridill",
      "Tiamat",
      "Ultima",
    ],
  },
  {
    region: "JP",
    dc: "Mana",
    servers: [
      "Anima",
      "Asura",
      "Chocobo",
      "Hades",
      "Ixion",
      "Masamune",
      "Pandaemonium",
      "Titan",
    ],
  },
  {
    region: "JP",
    dc: "Meteor",
    servers: [
      "Belias",
      "Mandragora",
      "Ramuh",
      "Shinryu",
      "Unicorn",
      "Valefor",
      "Yojimbo",
      "Zeromus",
    ],
  },
  {
    region: "OCE",
    dc: "Materia",
    servers: ["Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan"],
  },
];
