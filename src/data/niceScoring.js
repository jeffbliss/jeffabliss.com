import {
  NICE_NUMBERS,
  MAX_LEVEL,
  CATEGORY_CONFIG,
  TIER_THRESHOLDS,
  TIER_COLORS,
  OVERALL_TIERS,
} from "./niceConstants.js";

function countSubstring(str, sub) {
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

function scoreLodestoneId(id) {
  const idStr = String(id);
  const count = countSubstring(idStr, "69");
  const score = Math.min(count, 2) * 25;
  const details =
    count > 0
      ? `ID ${idStr} contains "69" ${count}x — +25 per occurrence, max 2`
      : `ID ${idStr} — no "69" found. +25 per "69" in your ID, max 2`;
  return { score, details };
}

function scoreJobsAt69(jobs) {
  const niceJobs = jobs.filter((j) => j.level === 69);
  const count = niceJobs.length;
  const score = Math.min(count, 3) * 23;
  const details =
    count > 0
      ? `${niceJobs.map((j) => j.name).join(", ")} FROZEN AT NICE — ${count}x 23pts (max 3 jobs)`
      : "No jobs sitting at exactly Lv.69. +23 per job you leave at 69, max 3";
  return { score, details };
}

function scoreMinionPercent(minionCount, totalMinions) {
  if (!totalMinions) return { score: 0, details: "No minion data" };
  const pct = (minionCount / totalMinions) * 100;
  const distance = Math.abs(pct - 69);
  const score = Math.max(0, Math.round(30 - distance * 1.5));
  const details = `${minionCount}/${totalMinions} = ${pct.toFixed(1)}% — ${distance < 1 ? "right on 69%!" : `${distance.toFixed(1)}% away from 69%`}. Closer = more points`;
  return { score, details };
}

function scoreMountPercent(mountCount, totalMounts) {
  if (!totalMounts) return { score: 0, details: "No mount data" };
  const pct = (mountCount / totalMounts) * 100;
  const distance = Math.abs(pct - 69);
  const score = Math.max(0, Math.round(30 - distance * 1.5));
  const details = `${mountCount}/${totalMounts} = ${pct.toFixed(1)}% — ${distance < 1 ? "right on 69%!" : `${distance.toFixed(1)}% away from 69%`}. Closer = more points`;
  return { score, details };
}

function scoreAchievementPoints(points) {
  if (points == null) return { score: 0, details: "No achievement data" };
  let nearest = NICE_NUMBERS[0];
  let minDist = Math.abs(points - nearest);
  for (const n of NICE_NUMBERS) {
    const d = Math.abs(points - n);
    if (d < minDist) {
      minDist = d;
      nearest = n;
    }
  }
  const score = Math.max(0, Math.round(35 - (minDist / 500) * 35));
  const details =
    minDist === 0
      ? `${points} points — EXACTLY ${nearest}! Max points!`
      : `${points} pts — ${minDist} away from nearest nice# (${nearest}). Within 500 = points`;
  return { score, details };
}

function scoreActiveJob(activeJob) {
  if (!activeJob) return { score: 0, details: "No active job data" };
  const score = activeJob.level === 69 ? 42 : 0;
  const jobDisplay = activeJob.name || "unknown job";
  const details =
    activeJob.level === 69
      ? `Currently on ${jobDisplay} at level 69! Full 42 points!`
      : `Currently ${jobDisplay} Lv.${activeJob.level} — switch to a Lv.69 job for 42pts`;
  return { score, details };
}

function scoreNameNiceometry(name) {
  if (!name) return { score: 0, details: "No name data" };
  const noSpaces = name.replace(/\s/g, "");
  let score = 0;
  const findings = [];
  if (noSpaces.length === 6) {
    score += 7;
    findings.push("name is 6 characters");
  }
  if (noSpaces.length === 9) {
    score += 7;
    findings.push("name is 9 characters");
  }
  const lower = name.toLowerCase();
  if (lower.includes("69") || lower.includes("nice")) {
    score += 6;
    findings.push(`contains "${lower.includes("69") ? "69" : "nice"}"`);
  }
  score = Math.min(score, 20);
  const details =
    findings.length > 0
      ? `"${name}" — ${findings.join(", ")}. +7 per length match, +6 for nice text`
      : `"${name}" (${noSpaces.length} chars) — need 6 or 9 chars, or "69"/"nice" in name`;
  return { score, details };
}

function scoreMaxedJobs(jobs) {
  const count = jobs.filter((j) => j.level === MAX_LEVEL).length;
  const score = count === 6 || count === 9 ? 20 : 0;
  const details =
    score > 0
      ? `${count} jobs at max level — exactly ${count} is a nice number! Full 20pts`
      : `${count} jobs at max — need exactly 6 or 9 maxed jobs for 20pts`;
  return { score, details };
}

function scoreAvgJobLevel(jobs) {
  const leveled = jobs.filter((j) => j.level > 0);
  if (leveled.length === 0) return { score: 0, details: "No leveled jobs" };
  const avg = leveled.reduce((sum, j) => sum + j.level, 0) / leveled.length;
  const distance = Math.abs(avg - 69);
  const score = Math.max(0, Math.round(20 - distance * 2));
  const details = `Avg level: ${avg.toFixed(1)} — ${distance < 1 ? "basically 69!" : `${distance.toFixed(1)} away from 69`}. Within 10 = points`;
  return { score, details };
}

function scoreGearStats(gearStats) {
  if (!gearStats) return { score: 0, details: "No gear stat data" };
  const hits = [];
  for (const [stat, val] of Object.entries(gearStats)) {
    if (NICE_NUMBERS.includes(val) || String(val).includes("69")) {
      hits.push(`${stat}: ${val}`);
    }
  }
  const score = Math.min(hits.length, 4) * 10;
  const details =
    hits.length > 0
      ? `${hits.join(", ")} — +10 per nice stat, max 4`
      : "No stats equal to 69/420/6969 or containing '69'. +10 each, max 4";
  return { score, details };
}

function scoreBioNiceometry(bio) {
  if (!bio) return { score: 0, details: "No bio set" };
  let score = 0;
  const findings = [];
  if (bio.length === 69) {
    score += 10;
    findings.push("bio is exactly 69 characters!");
  }
  const lower = bio.toLowerCase();
  if (lower.includes("69") || lower.includes("nice") || lower.includes("420")) {
    score += 7;
    findings.push("contains a nice string");
  }
  if (bio.length === 6 || bio.length === 9) {
    score += 7;
    findings.push(`bio is ${bio.length} characters`);
  }
  score = Math.min(score, 24);
  const details =
    findings.length > 0
      ? `${findings.join(", ")}. +10 for 69 chars, +7 for nice text, +7 for 6/9 length`
      : `Bio is ${bio.length} chars — need 69 chars, or "69"/"nice"/"420" in text, or 6/9 char length`;
  return { score, details };
}

function scoreFcNiceness(fc) {
  if (!fc) return { score: 0, details: "Not in a Free Company" };
  let score = 0;
  const findings = [];
  if (fc.tag === "69" || (fc.tag && fc.tag.toUpperCase() === "NICE")) {
    score += 10;
    findings.push(`FC tag [${fc.tag}]`);
  }
  if (fc.memberCount === 69) {
    score += 8;
    findings.push("FC has 69 members!");
  }
  if (fc.name && (fc.name.toLowerCase().includes("69") || fc.name.toLowerCase().includes("nice"))) {
    score += 7;
    findings.push(`FC name "${fc.name}"`);
  }
  score = Math.min(score, 25);
  const details =
    findings.length > 0
      ? `${findings.join(", ")}. +10 for nice tag, +8 for 69 members, +7 for nice name`
      : `FC "${fc.name}"${fc.tag ? ` [${fc.tag}]` : ""} — ${fc.memberCount || "?"} members. Need tag "69"/"NICE", 69 members, or "69"/"nice" in name`;
  return { score, details };
}

function scoreNamedayDeity(nameday, guardianDeityId) {
  let score = 0;
  const findings = [];
  if (nameday) {
    const digits = nameday.match(/\d/g) || [];
    const has6 = digits.includes("6");
    const has9 = digits.includes("9");
    if (has6 && has9) {
      score += 8;
      findings.push(`nameday has both 6 and 9 (+8)`);
    } else if (has6 || has9) {
      score += 4;
      findings.push(`nameday has a ${has6 ? "6" : "9"} (+4)`);
    }
  }
  if (guardianDeityId === 6 || guardianDeityId === 9) {
    score += 3;
    findings.push(`deity ID ${guardianDeityId} (+3)`);
  }
  score = Math.min(score, 15);
  const details =
    findings.length > 0
      ? `${nameday || "?"} — ${findings.join(", ")}`
      : `${nameday || "?"} — need 6 or 9 in nameday (+4/+8) or deity ID 6/9 (+3)`;
  return { score, details };
}

function getTier(score, maxScore) {
  if (maxScore === 0) return "SAD";
  const pct = score / maxScore;
  for (const t of TIER_THRESHOLDS) {
    if (pct >= t.min) return t.name;
  }
  return "SAD";
}

function getOverallTier(totalScore) {
  for (const t of OVERALL_TIERS) {
    if (totalScore >= t.min && totalScore <= t.max) {
      return { ...t, color: TIER_COLORS[totalScore >= 350 ? "LEGENDARY" : totalScore >= 200 ? "NICE" : totalScore >= 100 ? "CLOSE" : totalScore >= 1 ? "MEH" : "SAD"] };
    }
  }
  return { ...OVERALL_TIERS[OVERALL_TIERS.length - 1], color: TIER_COLORS.SAD };
}

function findNiceMultiples(character) {
  const fields = {};
  fields["Lodestone ID"] = character.id;
  if (character.jobs) {
    for (const j of character.jobs) {
      if (j.level > 0) fields[`${j.name} Level`] = j.level;
    }
  }
  if (character.gearStats) {
    for (const [k, v] of Object.entries(character.gearStats)) {
      fields[k] = v;
    }
  }
  fields["Minion Count"] = character.minionCount;
  fields["Mount Count"] = character.mountCount;
  if (character.achievementPoints) {
    fields["Achievement Points"] = character.achievementPoints;
  }
  if (character.fc?.memberCount) {
    fields["FC Members"] = character.fc.memberCount;
  }

  const results = [];
  for (const [field, value] of Object.entries(fields)) {
    if (value == null || value < 69) continue;
    const remainder = value % 69;
    if (remainder <= 3 || remainder >= 66) {
      const quotient = Math.round(value / 69);
      const actualRemainder = value - quotient * 69;
      results.push({ field, value, quotient, remainder: actualRemainder });
    }
  }
  return results;
}

const scoringFunctions = {
  lodestoneId: (c, t) => scoreLodestoneId(c.id),
  jobsAt69: (c, t) => scoreJobsAt69(c.jobs || []),
  minionPercent: (c, t) => scoreMinionPercent(c.minionCount, t.minions),
  mountPercent: (c, t) => scoreMountPercent(c.mountCount, t.mounts),
  achievementPoints: (c, t) => scoreAchievementPoints(c.achievementPoints),
  activeJobLevel: (c, t) => scoreActiveJob(c.activeJob),
  nameNiceometry: (c, t) => scoreNameNiceometry(c.name),
  maxedJobCount: (c, t) => scoreMaxedJobs(c.jobs || []),
  avgJobLevel: (c, t) => scoreAvgJobLevel(c.jobs || []),
  gearStats: (c, t) => scoreGearStats(c.gearStats),
  bioNiceometry: (c, t) => scoreBioNiceometry(c.bio),
  fcNiceness: (c, t) => scoreFcNiceness(c.fc),
  namedayDeity: (c, t) => scoreNamedayDeity(c.nameday, c.guardianDeityId),
};

export function calculateNiceScore(character, totals) {
  const categories = CATEGORY_CONFIG.map((cat) => {
    const fn = scoringFunctions[cat.id];
    const { score, details } = fn(character, totals);
    const clampedScore = Math.min(score, cat.maxScore);
    return {
      id: cat.id,
      name: cat.name,
      score: clampedScore,
      maxScore: cat.maxScore,
      details,
      tier: getTier(clampedScore, cat.maxScore),
    };
  });

  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const overallTier = getOverallTier(totalScore);
  const niceMultiples = findNiceMultiples(character);

  return { totalScore, categories, overallTier, niceMultiples };
}
