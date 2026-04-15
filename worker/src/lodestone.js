import { parse } from 'node-html-parser';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const FETCH_HEADERS = {
  'User-Agent': USER_AGENT,
  'Accept-Language': 'en-US,en;q=0.9',
};

export async function searchCharacter(name, server) {
  const url = `https://na.finalfantasyxiv.com/lodestone/character/?q=${encodeURIComponent(name)}&worldname=${server}`;
  const response = await fetch(url, { headers: FETCH_HEADERS });
  const html = await response.text();
  const root = parse(html);

  const entryLinks = root.querySelectorAll('a.entry__link');
  for (const link of entryLinks) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/lodestone\/character\/(\d+)\//);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  const allLinks = root.querySelectorAll('.ldst__window a');
  for (const link of allLinks) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/lodestone\/character\/(\d+)\//);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  const fallbackLinks = root.querySelectorAll('a[href*="/lodestone/character/"]');
  for (const link of fallbackLinks) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/\/lodestone\/character\/(\d+)\//);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  throw new Error('not_found');
}

function safeText(root, selector) {
  try {
    const el = root.querySelector(selector);
    return el ? el.text.trim() : null;
  } catch {
    return null;
  }
}

function safeAttr(root, selector, attr) {
  try {
    const el = root.querySelector(selector);
    return el ? el.getAttribute(attr) : null;
  } catch {
    return null;
  }
}

function extractJobs(root) {
  try {
    const jobs = [];
    const jobEntries = root.querySelectorAll('.character__job li');

    for (const entry of jobEntries) {
      try {
        const nameEl = entry.querySelector('.character__job__name');
        const levelEl = entry.querySelector('.character__job__level');

        if (!nameEl && !levelEl) {
          const img = entry.querySelector('img');
          const jobName = img ? (img.getAttribute('data-tooltip') || img.getAttribute('alt') || '').trim() : '';
          const levelText = entry.text.trim();
          const levelMatch = levelText.match(/(\d+)/);
          if (jobName && levelMatch) {
            jobs.push({ name: jobName, level: parseInt(levelMatch[1], 10) });
          }
          continue;
        }

        const name = nameEl ? nameEl.text.trim() : '';
        const levelText = levelEl ? levelEl.text.trim() : '';
        const level = levelText === '-' ? 0 : parseInt(levelText, 10) || 0;

        if (name) {
          jobs.push({ name, level });
        }
      } catch {
        continue;
      }
    }

    if (jobs.length === 0) {
      const classSections = root.querySelectorAll('.character__level__list li');
      for (const section of classSections) {
        try {
          const img = section.querySelector('img');
          const jobName = img ? (img.getAttribute('data-tooltip') || img.getAttribute('alt') || '').trim() : '';
          const levelText = section.text.trim();
          const levelMatch = levelText.match(/(\d+)/);
          if (jobName && levelMatch) {
            jobs.push({ name: jobName, level: parseInt(levelMatch[1], 10) });
          }
        } catch {
          continue;
        }
      }
    }

    return jobs;
  } catch {
    return [];
  }
}

const STAT_KEY_MAP = {
  'Strength': 'Strength',
  'Dexterity': 'Dexterity',
  'Vitality': 'Vitality',
  'Intelligence': 'Intelligence',
  'Mind': 'Mind',
  'Critical Hit Rate': 'CriticalHitRate',
  'Critical Hit': 'CriticalHitRate',
  'Determination': 'Determination',
  'Direct Hit Rate': 'DirectHitRate',
  'Direct Hit': 'DirectHitRate',
  'Defense': 'Defense',
  'Magic Defense': 'MagicDefense',
  'Attack Power': 'AttackPower',
  'Skill Speed': 'SkillSpeed',
  'Attack Magic Potency': 'AttackMagicPotency',
  'Healing Magic Potency': 'HealingMagicPotency',
  'Spell Speed': 'SpellSpeed',
  'Tenacity': 'Tenacity',
  'Piety': 'Piety',
};

function extractGearStats(root) {
  try {
    const stats = {};

    const rows = root.querySelectorAll('.character__param__list tr');
    for (const row of rows) {
      try {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (!th || !td) continue;
        const rawName = (th.querySelector('span') || th).text.trim();
        const value = parseInt(td.text.trim().replace(/,/g, ''), 10);
        const key = STAT_KEY_MAP[rawName] || rawName.replace(/\s+/g, '');
        if (key && !isNaN(value)) {
          stats[key] = value;
        }
      } catch {
        continue;
      }
    }

    const hpMpList = root.querySelectorAll('.character__param ul li');
    for (const li of hpMpList) {
      try {
        const text = li.text.trim();
        const match = text.match(/([\d,]+)/);
        if (match) {
          const val = parseInt(match[1].replace(/,/g, ''), 10);
          if (text.toLowerCase().includes('hp') || li.querySelector('[class*="hp"]')) {
            stats['HP'] = val;
          } else if (text.toLowerCase().includes('mp') || li.querySelector('[class*="mp"]')) {
            stats['MP'] = val;
          }
        }
      } catch {
        continue;
      }
    }

    return Object.keys(stats).length > 0 ? stats : null;
  } catch {
    return null;
  }
}

function extractNameday(root) {
  try {
    const namedayEl = root.querySelector('.character__profile__data__detail .character__block__birth');
    if (namedayEl) {
      return namedayEl.text.trim();
    }

    const allText = root.querySelectorAll('.character__profile__data p');
    for (const el of allText) {
      const text = el.text.trim();
      if (text.match(/\d+.*sun.*\d+.*(?:astral|umbral)/i)) {
        return text;
      }
    }

    const blockTitles = root.querySelectorAll('.character__profile__data__detail');
    for (const block of blockTitles) {
      const text = block.text;
      if (text.includes('Nameday')) {
        const parts = block.querySelectorAll('p');
        for (const p of parts) {
          const pText = p.text.trim();
          if (pText && !pText.includes('Nameday')) {
            return pText;
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

function extractGuardianDeity(root) {
  try {
    const titles = root.querySelectorAll('.character-block__title');
    for (const title of titles) {
      if (title.text.trim() === 'Guardian') {
        const parent = title.parentNode;
        const nameEl = parent.querySelector('.character-block__name');
        if (nameEl) return nameEl.text.trim();
      }
    }

    const blocks = root.querySelectorAll('.character-block__box');
    for (const block of blocks) {
      const text = block.text;
      if (text.includes('Guardian')) {
        const paragraphs = block.querySelectorAll('p');
        for (let i = 0; i < paragraphs.length; i++) {
          if (paragraphs[i].text.trim() === 'Guardian' && paragraphs[i + 1]) {
            return paragraphs[i + 1].text.trim();
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

const WEAPON_CATEGORY_TO_JOB = {
  "gladiator's arm": "Paladin",
  "marauder's arm": "Warrior",
  "dark knight's arm": "Dark Knight",
  "gunbreaker's arm": "Gunbreaker",
  "one-handed conjurer's arm": "White Mage",
  "two-handed conjurer's arm": "White Mage",
  "conjurer's arm": "White Mage",
  "scholar's arm": "Scholar",
  "astrologian's arm": "Astrologian",
  "sage's arm": "Sage",
  "pugilist's arm": "Monk",
  "lancer's arm": "Dragoon",
  "rogue's arm": "Ninja",
  "samurai's arm": "Samurai",
  "reaper's arm": "Reaper",
  "viper's arm": "Viper",
  "archer's arm": "Bard",
  "machinist's arm": "Machinist",
  "dancer's arm": "Dancer",
  "one-handed thaumaturge's arm": "Black Mage",
  "two-handed thaumaturge's arm": "Black Mage",
  "thaumaturge's arm": "Black Mage",
  "arcanist's arm": "Summoner",
  "red mage's arm": "Red Mage",
  "pictomancer's arm": "Pictomancer",
  "blue mage's arm": "Blue Mage",
  "carpenter's primary tool": "Carpenter",
  "blacksmith's primary tool": "Blacksmith",
  "armorer's primary tool": "Armorer",
  "goldsmith's primary tool": "Goldsmith",
  "leatherworker's primary tool": "Leatherworker",
  "weaver's primary tool": "Weaver",
  "alchemist's primary tool": "Alchemist",
  "culinarian's primary tool": "Culinarian",
  "miner's primary tool": "Miner",
  "botanist's primary tool": "Botanist",
  "fisher's primary tool": "Fisher",
};

function extractActiveJob(root, jobs) {
  try {
    const levelEl = root.querySelector('.character__class__data p');
    if (!levelEl) return null;
    const levelMatch = levelEl.text.trim().match(/(\d+)/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) : null;

    let jobName = null;

    const weaponCategory = root.querySelector('.db-tooltip__item__category');
    if (weaponCategory) {
      const cat = weaponCategory.text.trim().toLowerCase().replace(/&#39;/g, "'").replace(/&apos;/g, "'");
      jobName = WEAPON_CATEGORY_TO_JOB[cat] || null;
    }

    if (!jobName) {
      const nameEl = root.querySelector('.character__class__data .character__class_icon img');
      if (nameEl) {
        jobName = (nameEl.getAttribute('data-tooltip') || nameEl.getAttribute('alt') || '').trim() || null;
      }
    }

    if (!jobName && jobs && jobs.length > 0 && level !== null) {
      const combatJobs = jobs.slice(0, 22);
      const matches = combatJobs.filter(j => j.level === level);
      if (matches.length === 1) {
        jobName = matches[0].name;
      }
    }

    return { name: jobName, level };
  } catch {
    return null;
  }
}

function countCollection(root) {
  try {
    const items = root.querySelectorAll('.minion__list_icon');
    if (items.length > 0) return items.length;

    const items2 = root.querySelectorAll('.mount__list_icon');
    if (items2.length > 0) return items2.length;

    const items3 = root.querySelectorAll('.character__minion__icon');
    if (items3.length > 0) return items3.length;

    const items4 = root.querySelectorAll('.character__mount__icon');
    if (items4.length > 0) return items4.length;

    const listItems = root.querySelectorAll('.character__icon__list li a');
    if (listItems.length > 0) return listItems.length;

    const allListItems = root.querySelectorAll('.character__minionicon, .character__mounticon');
    if (allListItems.length > 0) return allListItems.length;

    return 0;
  } catch {
    return 0;
  }
}

export async function fetchAndParseCharacter(characterId) {
  const baseUrl = 'https://na.finalfantasyxiv.com/lodestone/character';

  const [charResponse, minionResponse, mountResponse] = await Promise.all([
    fetch(`${baseUrl}/${characterId}/`, { headers: FETCH_HEADERS }),
    fetch(`${baseUrl}/${characterId}/minion/`, { headers: FETCH_HEADERS }),
    fetch(`${baseUrl}/${characterId}/mount/`, { headers: FETCH_HEADERS }),
  ]);

  const [charHtml, minionHtml, mountHtml] = await Promise.all([
    charResponse.text(),
    minionResponse.text(),
    mountResponse.text(),
  ]);

  const charRoot = parse(charHtml);
  const minionRoot = parse(minionHtml);
  const mountRoot = parse(mountHtml);

  const name = safeText(charRoot, '.frame__chara__name');
  const serverDc = safeText(charRoot, '.frame__chara__world');
  const portrait = safeAttr(charRoot, '.frame__chara__face img', 'src');
  const title = safeText(charRoot, '.frame__chara__title');
  const bio = safeText(charRoot, '.character__selfintroduction');
  const nameday = extractNameday(charRoot);
  const guardianDeity = extractGuardianDeity(charRoot);
  const jobs = extractJobs(charRoot);
  const activeJob = extractActiveJob(charRoot, jobs);
  const gearStats = extractGearStats(charRoot);

  let fcName = null;
  let fcId = null;
  try {
    fcName = safeText(charRoot, '.character__freecompany__name a') || safeText(charRoot, '.character__freecompany__name');
    const fcLink = charRoot.querySelector('.character__freecompany__name a');
    if (fcLink) {
      const href = fcLink.getAttribute('href') || '';
      const fcMatch = href.match(/\/freecompany\/(\d+)\//);
      if (fcMatch) {
        fcId = fcMatch[1];
      }
    }
  } catch {
  }

  const minionCount = countCollection(minionRoot);
  const mountCount = countCollection(mountRoot);

  let achievementPoints = null;
  try {
    const achResponse = await fetch(`${baseUrl}/${characterId}/achievement/`, { headers: FETCH_HEADERS });
    const achHtml = await achResponse.text();
    const achRoot = parse(achHtml);
    const achTotalEl = achRoot.querySelector('.achievement__point');
    if (achTotalEl) {
      const achMatch = achTotalEl.text.trim().match(/([\d,]+)/);
      if (achMatch) {
        achievementPoints = parseInt(achMatch[1].replace(/,/g, ''), 10);
      }
    }
    if (!achievementPoints) {
      const allText = achRoot.querySelectorAll('.heading__element, .achievement__header, h2, h3, p');
      for (const el of allText) {
        const txt = el.text.trim();
        const m = txt.match(/^([\d,]+)$/);
        if (m && parseInt(m[1].replace(/,/g, ''), 10) > 100) {
          achievementPoints = parseInt(m[1].replace(/,/g, ''), 10);
          break;
        }
      }
    }
  } catch {
  }

  let fcTag = null;
  let fcMemberCount = null;
  if (fcId) {
    try {
      const fcResponse = await fetch(`https://na.finalfantasyxiv.com/lodestone/freecompany/${fcId}/`, { headers: FETCH_HEADERS });
      const fcHtml = await fcResponse.text();
      const fcRoot = parse(fcHtml);
      const tagEls = fcRoot.querySelectorAll('p.freecompany__text__tag, p.freecompany__text.freecompany__text__tag');
      for (const el of tagEls) {
        const rawTag = el.text.trim().replace(/[«»\u00AB\u00BB]/g, '').trim();
        if (rawTag && rawTag !== 'Company Tag') {
          fcTag = rawTag;
          break;
        }
      }
      if (!fcTag) {
        const allTagEls = fcRoot.querySelectorAll('.freecompany__text__tag');
        for (const el of allTagEls) {
          if (el.tagName === 'P' || el.tagName === 'p') {
            const rawTag = el.text.trim().replace(/[«»\u00AB\u00BB]/g, '').trim();
            if (rawTag) { fcTag = rawTag; break; }
          }
        }
      }
      const allP = fcRoot.querySelectorAll('p.freecompany__text');
      const allH3 = fcRoot.querySelectorAll('h3.heading--lead');
      for (const h of allH3) {
        if (h.text.includes('Active Members')) {
          let sibling = h.nextElementSibling;
          if (sibling) {
            const mm = sibling.text.trim().match(/([\d,]+)/);
            if (mm) { fcMemberCount = parseInt(mm[1].replace(/,/g, ''), 10); break; }
          }
        }
      }
      if (!fcMemberCount) {
        for (let i = 0; i < allP.length; i++) {
          const txt = allP[i].text.trim();
          if (/^\d+$/.test(txt) && parseInt(txt, 10) > 0 && parseInt(txt, 10) < 1000) {
            fcMemberCount = parseInt(txt, 10);
            break;
          }
        }
      }
    } catch {
    }
  }

  return {
    id: characterId,
    name,
    serverDc,
    portrait,
    title,
    bio,
    nameday,
    guardianDeity,
    activeJob,
    jobs,
    gearStats,
    fcName,
    fcId,
    fcTag,
    fcMemberCount,
    achievementPoints,
    minionCount,
    mountCount,
  };
}
