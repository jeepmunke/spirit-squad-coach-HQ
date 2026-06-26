import { SKILL_LIBRARY } from '@/constants/skills';
import { currentRating, numericRating } from '@/stores/appStore';
import type { AttendanceMap, ScheduleEvent, EvalLogEntry } from '@/types';

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  excused: number;
  pct: number;
  weightedPct: number;
}

export function attendanceStats(
  athleteId: number,
  attendance: AttendanceMap,
  scheduleEvents: ScheduleEvent[],
): AttendanceStats {
  const scheduledDates = new Set(scheduleEvents.map((e) => e.date));
  const relevantDates = Object.keys(attendance).filter((d) => scheduledDates.has(d));
  let present = 0, absent = 0, excused = 0, weightedTotal = 0, weightedPresent = 0;
  relevantDates.forEach((d) => {
    const s = (attendance[d] ?? {})[athleteId] ?? 'present';
    const event = scheduleEvents.find((e) => e.date === d);
    const weight = event?.priority ?? 1;
    if (s === 'present') { present++; weightedPresent += weight; }
    else if (s === 'absent') absent++;
    else excused++;
    weightedTotal += weight;
  });
  const total = relevantDates.length;
  return {
    total, present, absent, excused,
    pct: total ? Math.round((present / total) * 100) : 100,
    weightedPct: weightedTotal ? Math.round((weightedPresent / weightedTotal) * 100) : 100,
  };
}

export function getAttendanceAlert(
  stats: AttendanceStats,
  thresholds: { yellowAbsences: number; redAbsences: number; yellowPct: number; redPct: number },
): 'red' | 'yellow' | 'green' {
  if (stats.absent >= thresholds.redAbsences || stats.pct <= thresholds.redPct) return 'red';
  if (stats.absent >= thresholds.yellowAbsences || stats.pct <= thresholds.yellowPct) return 'yellow';
  return 'green';
}

export const alertColor = (level: 'red' | 'yellow' | 'green') =>
  level === 'red' ? '#D9667A' : level === 'yellow' ? '#E8A33D' : '#4CAF7D';

// ─── Skill stats ──────────────────────────────────────────────────────────────

export interface SkillCatStats {
  skills: Array<{ skill: string; rating: string; isNA: boolean; numeric: number | null }>;
  avg: string | null;
}

export function calcAthleteStats(
  athleteId: number,
  evalLog: EvalLogEntry[],
  naSkills: Record<number, Record<string, boolean>>,
  seasonIdx: number,
  seasons: string[],
): Record<string, SkillCatStats> {
  const results: Record<string, SkillCatStats> = {};
  Object.entries(SKILL_LIBRARY).forEach(([cat, skills]) => {
    let catSum = 0, catCount = 0;
    const skillResults: SkillCatStats['skills'] = [];
    (skills as readonly string[]).forEach((skill) => {
      const naKey = `${cat}|${skill}`;
      const isNA = !!(naSkills[athleteId]?.[naKey]);
      const rating = currentRating(evalLog, { athleteId, category: cat, skill, upToSeasonIdx: seasonIdx }, seasons);
      const num = isNA ? null : numericRating(rating);
      skillResults.push({ skill, rating, isNA, numeric: num });
      if (!isNA && num !== null) { catSum += num; catCount++; }
    });
    results[cat] = { skills: skillResults, avg: catCount ? (catSum / catCount).toFixed(2) : null };
  });
  return results;
}
