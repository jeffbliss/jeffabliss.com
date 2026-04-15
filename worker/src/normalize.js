const DEITY_IDS = {
  Halone: 1,
  Menphina: 2,
  Thaliak: 3,
  Nymeia: 4,
  Llymlaen: 5,
  Nophica: 6,
  Byregot: 7,
  Rhalgr: 8,
  Azeyma: 9,
  "Nald'thal": 10,
  Oschon: 11,
  Althyk: 12,
};

const JOB_ABBREVIATIONS = {
  Paladin: 'PLD',
  Warrior: 'WAR',
  'Dark Knight': 'DRK',
  Gunbreaker: 'GNB',
  'White Mage': 'WHM',
  Scholar: 'SCH',
  Astrologian: 'AST',
  Sage: 'SGE',
  Monk: 'MNK',
  Dragoon: 'DRG',
  Ninja: 'NIN',
  Samurai: 'SAM',
  Reaper: 'RPR',
  Viper: 'VPR',
  Bard: 'BRD',
  Machinist: 'MCH',
  Dancer: 'DNC',
  'Black Mage': 'BLM',
  Summoner: 'SMN',
  'Red Mage': 'RDM',
  Pictomancer: 'PCT',
  'Blue Mage': 'BLU',
  Carpenter: 'CRP',
  Blacksmith: 'BSM',
  Armorer: 'ARM',
  Goldsmith: 'GSM',
  Leatherworker: 'LTW',
  Weaver: 'WVR',
  Alchemist: 'ALC',
  Culinarian: 'CUL',
  Miner: 'MIN',
  Botanist: 'BTN',
  Fisher: 'FSH',
};

function parseServerDc(serverDc) {
  if (!serverDc) return { server: null, datacenter: null };

  const match = serverDc.match(/^(.+?)\s*\[(.+?)\]/);
  if (match) {
    return {
      server: match[1].trim(),
      datacenter: match[2].trim(),
    };
  }

  return { server: serverDc.trim(), datacenter: null };
}

function resolveDeityId(deityName) {
  if (!deityName) return null;

  for (const [name, id] of Object.entries(DEITY_IDS)) {
    if (deityName.toLowerCase().includes(name.toLowerCase())) {
      return id;
    }
  }

  return null;
}

function cleanJobName(rawName) {
  if (!rawName) return '';
  let name = rawName.replace(/\s*\(Limited Job\)/i, '').trim();
  if (name.includes(' / ')) {
    name = name.split(' / ')[0].trim();
  }
  return name;
}

function normalizeJobs(rawJobs) {
  if (!rawJobs || !Array.isArray(rawJobs)) return [];

  return rawJobs.map((job) => {
    const name = cleanJobName(job.name);
    return {
      name,
      abbrev: JOB_ABBREVIATIONS[name] || '',
      level: typeof job.level === 'number' ? job.level : parseInt(job.level, 10) || 0,
    };
  });
}

function normalizeGearStats(rawStats) {
  if (!rawStats || typeof rawStats !== 'object') return null;

  const normalized = {};
  for (const [key, value] of Object.entries(rawStats)) {
    normalized[key] = typeof value === 'number' ? value : parseInt(value, 10) || 0;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function normalizeActiveJob(raw) {
  if (!raw || !raw.activeJob) return null;

  const { name, level } = raw.activeJob;
  const cleanedName = name ? cleanJobName(name) : null;
  const parsedLevel = typeof level === 'number' ? level : parseInt(level, 10) || 0;
  const isKnownJob = cleanedName && JOB_ABBREVIATIONS[cleanedName];

  if (isKnownJob) {
    return { name: cleanedName, level: parsedLevel };
  }

  if (raw.jobs && raw.jobs.length > 0 && parsedLevel > 0) {
    const combatJobs = raw.jobs.slice(0, 22);
    const atLevel = combatJobs.filter(j => j.level === parsedLevel);
    if (atLevel.length === 1) {
      const matched = cleanJobName(atLevel[0].name);
      return { name: matched, level: parsedLevel };
    }
  }

  return { name: null, level: parsedLevel };
}

function normalizeFc(raw) {
  if (!raw.fcName) return null;

  let tag = raw.fcTag || null;
  if (!tag && raw.fcName) {
    const tagMatch = raw.fcName.match(/[<\u00AB«](.+?)[>\u00BB»]/);
    if (tagMatch) {
      tag = tagMatch[1];
    }
  }

  return {
    name: raw.fcName.replace(/\s*[<\u00AB«].+?[>\u00BB»]\s*/, '').trim(),
    tag,
    memberCount: raw.fcMemberCount || null,
  };
}

export function normalizeCharacter(raw) {
  const { server, datacenter } = parseServerDc(raw.serverDc);

  return {
    id: raw.id || null,
    name: raw.name || null,
    server,
    datacenter,
    portrait: raw.portrait || null,
    title: raw.title || null,
    bio: raw.bio || null,
    nameday: raw.nameday || null,
    guardianDeityId: resolveDeityId(raw.guardianDeity),
    guardianDeityName: raw.guardianDeity || null,
    activeJob: normalizeActiveJob(raw),
    jobs: normalizeJobs(raw.jobs),
    minionCount: raw.minionCount || 0,
    mountCount: raw.mountCount || 0,
    achievementPoints: raw.achievementPoints || null,
    gearStats: normalizeGearStats(raw.gearStats),
    fc: normalizeFc(raw),
  };
}
