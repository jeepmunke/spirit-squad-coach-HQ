import { create } from 'zustand';
import type {
  Team, Athlete, EvalLogEntry, StuntGroup, GroupLogEntry,
  Pyramid, AttendanceMap, ScheduleEvent, AttendanceThresholds, RatingDisplayMode,
} from '@/types';
import { ATTENDANCE_PRESETS, SKILL_LIBRARY, RATING_LEVELS } from '@/constants/skills';
import { DEFAULT_THEME_KEY } from '@/constants/theme';

let _nextId = 1000;
const genId = () => _nextId++;

// ─── helpers (pure, no store deps) ───────────────────────────────────────────

export function currentRating(
  log: EvalLogEntry[],
  params: { athleteId: number; category: string; skill: string; position?: string; upToSeasonIdx?: number },
  seasons: string[],
): string {
  let entries = log.filter(
    (e) =>
      e.athleteId === params.athleteId &&
      e.category === params.category &&
      e.skill === params.skill &&
      (params.category !== 'stunting' || e.position === params.position),
  );
  if (params.upToSeasonIdx != null) {
    entries = entries.filter((e) => seasons.indexOf(e.season) <= params.upToSeasonIdx!);
  }
  if (!entries.length) return 'not_started';
  return [...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.rating;
}

export function currentGroupRating(
  groupLog: GroupLogEntry[],
  params: { groupId: number; skill: string; upToSeasonIdx?: number },
  seasons: string[],
): string {
  let entries = groupLog.filter((e) => e.groupId === params.groupId && e.skill === params.skill);
  if (params.upToSeasonIdx != null) {
    entries = entries.filter((e) => seasons.indexOf(e.season) <= params.upToSeasonIdx!);
  }
  if (!entries.length) return 'not_started';
  return [...entries].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.rating;
}

export function autoLabelSlots<T extends { position: string; label: string }>(slots: T[]): T[] {
  const counts: Record<string, number> = {};
  return slots.map((slot) => {
    counts[slot.position] = (counts[slot.position] ?? 0) + 1;
    const label = counts[slot.position] > 1 ? `${slot.position} ${counts[slot.position]}` : slot.position;
    return { ...slot, label };
  });
}

export function numericRating(key: string): number {
  return RATING_LEVELS.find((r) => r.key === key)?.numeric ?? 0;
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AppState {
  // Theme
  themeKey: string;
  customTheme: { primary: string; accent: string };
  setThemeKey: (key: string) => void;
  setCustomTheme: (t: { primary: string; accent: string }) => void;

  // Pro
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  ratingDisplayMode: RatingDisplayMode;
  setRatingDisplayMode: (m: RatingDisplayMode) => void;

  // Teams
  teams: Team[];
  activeTeamId: number;
  setActiveTeamId: (id: number) => void;
  setTeams: (teams: Team[]) => void;
  addTeam: () => void;

  // Seasons
  seasons: string[];
  currentSeason: string;
  season: string;
  setSeason: (s: string) => void;
  setCurrentSeason: (s: string) => void;
  setSeasons: (seasons: string[]) => void;
  addSeason: () => void;

  // Athletes
  athletes: Athlete[];
  setAthletes: (a: Athlete[]) => void;
  addAthlete: (a: Omit<Athlete, 'id' | 'teamId' | 'photo'>) => void;
  removeAthlete: (id: number) => void;
  updateAthletePhoto: (id: number, photo: string) => void;

  // Eval log
  evalLog: EvalLogEntry[];
  logRating: (params: { athleteId: number; category: string; skill: string; position?: string; rating: string }) => void;

  // N/A skills
  naSkills: Record<number, Record<string, boolean>>;
  setNaSkill: (athleteId: number, key: string, value: boolean) => void;

  // Combo/custom skill names
  comboNames: Record<string, string>;
  setComboName: (key: string, name: string) => void;
  customSkills: { jumps: string[]; tumbling: string[] };
  addCustomSkill: (category: 'jumps' | 'tumbling') => void;

  // Stunt groups
  groups: StuntGroup[];
  setGroups: (g: StuntGroup[]) => void;
  addGroup: (name: string) => number;
  removeGroup: (id: number) => void;
  addSlot: (groupId: number, position: string) => void;
  removeSlot: (groupId: number, slotId: string) => void;
  setSlotAthlete: (groupId: number, slotId: string, athleteId: number | null) => void;

  // Group log
  groupLog: GroupLogEntry[];
  cycleGroupRating: (groupId: number, skill: string) => void;

  // Pyramids
  pyramids: Pyramid[];
  setPyramids: (p: Pyramid[]) => void;
  addPyramid: (name: string) => number;
  removePyramid: (id: number) => void;
  addPyramidSection: (pyramidId: number) => void;
  removePyramidSection: (pyramidId: number, sectionId: string) => void;
  setPyramidSectionName: (pyramidId: number, sectionId: string, name: string) => void;
  addPyramidLayer: (pyramidId: number, sectionId: string) => void;
  removePyramidLayer: (pyramidId: number, sectionId: string, layerId: string) => void;
  setPyramidLayerLabel: (pyramidId: number, sectionId: string, layerId: string, label: string) => void;
  addPyramidSlot: (pyramidId: number, sectionId: string, layerId: string, position: string) => void;
  removePyramidSlot: (pyramidId: number, sectionId: string, layerId: string, slotId: string) => void;
  setPyramidSlotAthlete: (pyramidId: number, sectionId: string, layerId: string, slotId: string, athleteId: number | null) => void;
  swapPyramidSlots: (pyramidId: number, sourceSlotId: string, targetSlotId: string) => void;

  // Attendance
  attendance: AttendanceMap;
  cycleAttendance: (athleteId: number, date: string) => void;

  // Schedule
  schedule: ScheduleEvent[];
  setSchedule: (s: ScheduleEvent[]) => void;
  addEvent: (e: Omit<ScheduleEvent, 'id' | 'teamId' | 'priority'>) => void;
  removeEvent: (id: number) => void;
  importScheduleEvents: (events: Omit<ScheduleEvent, 'id' | 'teamId' | 'priority'>[]) => void;

  // Thresholds
  customThresholds: AttendanceThresholds;
  setCustomThresholds: (t: AttendanceThresholds) => void;
}

const INITIAL_SEASONS = ['2025 Fall', '2026 Spring', '2026 Fall'];
const INITIAL_CURRENT_SEASON = '2026 Fall';

export const useAppStore = create<AppState>((set, get) => ({
  // Theme
  themeKey: DEFAULT_THEME_KEY,
  customTheme: { primary: '#2B2030', accent: '#E8A33D' },
  setThemeKey: (key) => set({ themeKey: key }),
  setCustomTheme: (t) => set({ customTheme: t }),

  // Pro
  isPro: false,
  setIsPro: (v) => set({ isPro: v }),
  ratingDisplayMode: 'color',
  setRatingDisplayMode: (m) => set({ ratingDisplayMode: m }),

  // Teams
  teams: [
    { id: 1, name: 'Varsity Cheer', division: 'Large Varsity', level: 'Level 5', coaches: ['Coach Williams', 'Coach Martinez'] },
    { id: 2, name: 'JV Cheer', division: 'Medium JV', level: 'Level 3', coaches: ['Coach Williams'] },
  ],
  activeTeamId: 1,
  setActiveTeamId: (id) => set({ activeTeamId: id }),
  setTeams: (teams) => set({ teams }),
  addTeam: () => set((s) => ({ teams: [...s.teams, { id: genId(), name: 'New Team', division: '', level: '', coaches: [] }] })),

  // Seasons
  seasons: INITIAL_SEASONS,
  currentSeason: INITIAL_CURRENT_SEASON,
  season: INITIAL_CURRENT_SEASON,
  setSeason: (season) => set({ season }),
  setCurrentSeason: (currentSeason) => set({ currentSeason }),
  setSeasons: (seasons) => set({ seasons }),
  addSeason: () => set((s) => ({ seasons: [...s.seasons, 'New Season'] })),

  // Athletes
  athletes: [
    { id: 1, teamId: 1, name: 'Maddie Carter', grade: '10th', position: 'Flyer', photo: null, email: 'maddie@email.com', phone: '555-201-3344', isYouth: true, parentName: 'Lisa Carter', parentEmail: 'lisa@email.com', parentPhone: '555-201-9988', emergencyName: 'Tom Carter', emergencyPhone: '555-201-7766' },
    { id: 2, teamId: 1, name: 'Jordan Lee', grade: '11th', position: 'Base', photo: null, email: 'jordan@email.com', phone: '555-330-1122', isYouth: true, parentName: 'Karen Lee', parentEmail: 'karen@email.com', parentPhone: '555-330-4455', emergencyName: '', emergencyPhone: '' },
    { id: 3, teamId: 1, name: 'Ava Brooks', grade: '9th', position: 'Tumbler', photo: null, email: 'ava@email.com', phone: '555-440-2233', isYouth: false, parentName: '', parentEmail: '', parentPhone: '', emergencyName: 'Mark Brooks', emergencyPhone: '555-440-9900' },
    { id: 4, teamId: 1, name: 'Sophia Diaz', grade: '12th', position: 'Back Spot', photo: null, email: 'sophia@email.com', phone: '555-550-3344', isYouth: false, parentName: '', parentEmail: '', parentPhone: '', emergencyName: '', emergencyPhone: '' },
    { id: 5, teamId: 2, name: 'Riley Johnson', grade: '9th', position: 'Flyer', photo: null, email: 'riley@email.com', phone: '555-660-4455', isYouth: true, parentName: 'Dana Johnson', parentEmail: 'dana@email.com', parentPhone: '555-660-7788', emergencyName: '', emergencyPhone: '' },
  ],
  setAthletes: (athletes) => set({ athletes }),
  addAthlete: (a) => set((s) => ({ athletes: [...s.athletes, { ...a, id: genId(), teamId: s.activeTeamId, photo: null }] })),
  removeAthlete: (id) => set((s) => ({ athletes: s.athletes.filter((a) => a.id !== id) })),
  updateAthletePhoto: (id, photo) => set((s) => ({ athletes: s.athletes.map((a) => a.id === id ? { ...a, photo } : a) })),

  // Eval log
  evalLog: [],
  logRating: ({ athleteId, category, skill, position, rating }) => set((s) => ({
    evalLog: [...s.evalLog, {
      id: genId(),
      date: new Date().toISOString().slice(0, 10),
      season: s.season,
      athleteId, category, skill, rating,
      ...(category === 'stunting' ? { position: position as any } : {}),
    }],
  })),

  // N/A skills
  naSkills: {},
  setNaSkill: (athleteId, key, value) => set((s) => {
    const updated = { ...s.naSkills, [athleteId]: { ...(s.naSkills[athleteId] ?? {}), [key]: value } };
    if (!value) delete updated[athleteId][key];
    return { naSkills: updated };
  }),

  // Combo names
  comboNames: {},
  setComboName: (key, name) => set((s) => ({ comboNames: { ...s.comboNames, [key]: name } })),
  customSkills: { jumps: [], tumbling: [] },
  addCustomSkill: (category) => set((s) => {
    const label = category === 'jumps' ? 'Jump Combo' : 'Tumble Run';
    const existing = [...SKILL_LIBRARY[category], ...(s.customSkills[category] ?? [])].filter((sk) => sk.startsWith(label));
    return { customSkills: { ...s.customSkills, [category]: [...s.customSkills[category], `${label} ${existing.length + 1}`] } };
  }),

  // Stunt groups
  groups: [
    { id: 1, teamId: 1, name: 'Group 1', slots: [
      { slotId: 's1', position: 'Base', label: 'Base 1', athleteId: 2 },
      { slotId: 's2', position: 'Flyer', label: 'Flyer', athleteId: 1 },
      { slotId: 's3', position: 'Back Spot', label: 'Back Spot', athleteId: 4 },
    ]},
  ],
  setGroups: (groups) => set({ groups }),
  addGroup: (name) => {
    const id = genId();
    set((s) => ({ groups: [...s.groups, { id, teamId: s.activeTeamId, name, slots: [] }] }));
    return id;
  },
  removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),
  addSlot: (groupId, position) => set((s) => ({
    groups: s.groups.map((g) => g.id !== groupId ? g : {
      ...g, slots: autoLabelSlots([...g.slots, { slotId: `slot-${genId()}`, position, label: position, athleteId: null }]),
    }),
  })),
  removeSlot: (groupId, slotId) => set((s) => ({
    groups: s.groups.map((g) => g.id !== groupId ? g : { ...g, slots: autoLabelSlots(g.slots.filter((s) => s.slotId !== slotId)) }),
  })),
  setSlotAthlete: (groupId, slotId, athleteId) => set((s) => ({
    groups: s.groups.map((g) => g.id !== groupId ? g : { ...g, slots: g.slots.map((s) => s.slotId === slotId ? { ...s, athleteId } : s) }),
  })),

  // Group log
  groupLog: [],
  cycleGroupRating: (groupId, skill) => set((s) => {
    const cur = currentGroupRating(s.groupLog, { groupId, skill, upToSeasonIdx: s.seasons.indexOf(s.season) }, s.seasons);
    const idx = RATING_LEVELS.findIndex((r) => r.key === cur);
    const next = RATING_LEVELS[(idx + 1) % RATING_LEVELS.length];
    return { groupLog: [...s.groupLog, { id: genId(), date: new Date().toISOString().slice(0, 10), season: s.season, groupId, skill, rating: next.key }] };
  }),

  // Pyramids
  pyramids: [],
  setPyramids: (pyramids) => set({ pyramids }),
  addPyramid: (name) => {
    const id = genId();
    set((s) => ({
      pyramids: [...s.pyramids, {
        id, teamId: s.activeTeamId, name,
        sections: [{ sectionId: `sec-${genId()}`, sectionNumber: 1, name: 'Stunt 1', layers: [] }],
      }],
    }));
    return id;
  },
  removePyramid: (id) => set((s) => ({ pyramids: s.pyramids.filter((p) => p.id !== id) })),
  addPyramidSection: (pyramidId) => set((s) => ({
    pyramids: s.pyramids.map((p) => {
      if (p.id !== pyramidId) return p;
      const nextNum = (p.sections.length ? Math.max(...p.sections.map((sec) => sec.sectionNumber)) : 0) + 1;
      return { ...p, sections: [...p.sections, { sectionId: `sec-${genId()}`, sectionNumber: nextNum, name: `Stunt ${nextNum}`, layers: [] }] };
    }),
  })),
  removePyramidSection: (pyramidId, sectionId) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.filter((sec) => sec.sectionId !== sectionId) }),
  })),
  setPyramidSectionName: (pyramidId, sectionId, name) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, name }) }),
  })),
  addPyramidLayer: (pyramidId, sectionId) => set((s) => ({
    pyramids: s.pyramids.map((p) => {
      if (p.id !== pyramidId) return p;
      return { ...p, sections: p.sections.map((sec) => {
        if (sec.sectionId !== sectionId) return sec;
        const nextNum = (sec.layers.length ? Math.max(...sec.layers.map((l) => l.layerNumber)) : 0) + 1;
        return { ...sec, layers: [...sec.layers, { layerId: `layer-${genId()}`, layerNumber: nextNum, heightLabel: '', slots: [] }] };
      })};
    }),
  })),
  removePyramidLayer: (pyramidId, sectionId, layerId) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, layers: sec.layers.filter((l) => l.layerId !== layerId) }) }),
  })),
  setPyramidLayerLabel: (pyramidId, sectionId, layerId, heightLabel) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, layers: sec.layers.map((l) => l.layerId !== layerId ? l : { ...l, heightLabel }) }) }),
  })),
  addPyramidSlot: (pyramidId, sectionId, layerId, position) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, layers: sec.layers.map((l) => l.layerId !== layerId ? l : { ...l, slots: autoLabelSlots([...l.slots, { slotId: `pslot-${genId()}`, position, label: position, athleteId: null }]) }) }) }),
  })),
  removePyramidSlot: (pyramidId, sectionId, layerId, slotId) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, layers: sec.layers.map((l) => l.layerId !== layerId ? l : { ...l, slots: autoLabelSlots(l.slots.filter((s) => s.slotId !== slotId)) }) }) }),
  })),
  setPyramidSlotAthlete: (pyramidId, sectionId, layerId, slotId, athleteId) => set((s) => ({
    pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : { ...p, sections: p.sections.map((sec) => sec.sectionId !== sectionId ? sec : { ...sec, layers: sec.layers.map((l) => l.layerId !== layerId ? l : { ...l, slots: l.slots.map((sl) => sl.slotId !== slotId ? sl : { ...sl, athleteId }) }) }) }),
  })),
  swapPyramidSlots: (pyramidId, sourceSlotId, targetSlotId) => set((s) => {
    if (sourceSlotId === targetSlotId) return s;
    const pyramid = s.pyramids.find((p) => p.id === pyramidId);
    if (!pyramid) return s;
    let sourceAthlete: number | null = null, targetAthlete: number | null = null;
    pyramid.sections.forEach((sec) => sec.layers.forEach((l) => l.slots.forEach((sl) => {
      if (sl.slotId === sourceSlotId) sourceAthlete = sl.athleteId;
      if (sl.slotId === targetSlotId) targetAthlete = sl.athleteId;
    })));
    return {
      pyramids: s.pyramids.map((p) => p.id !== pyramidId ? p : {
        ...p, sections: p.sections.map((sec) => ({ ...sec, layers: sec.layers.map((l) => ({ ...l, slots: l.slots.map((sl) => {
          if (sl.slotId === sourceSlotId) return { ...sl, athleteId: targetAthlete };
          if (sl.slotId === targetSlotId) return { ...sl, athleteId: sourceAthlete };
          return sl;
        }) })) })),
      }),
    };
  }),

  // Attendance
  attendance: {
    '2026-06-01': { 1: 'present', 2: 'absent', 3: 'present', 4: 'present' },
    '2026-06-03': { 1: 'present', 2: 'present', 3: 'excused', 4: 'present' },
    '2026-06-08': { 1: 'absent', 2: 'present', 3: 'present', 4: 'present' },
    '2026-06-10': { 1: 'present', 2: 'present', 3: 'present', 4: 'absent' },
  },
  cycleAttendance: (athleteId, date) => set((s) => {
    const states: Array<'present' | 'absent' | 'excused'> = ['present', 'absent', 'excused'];
    const day = { ...(s.attendance[date] ?? {}) };
    const cur = day[athleteId] ?? 'present';
    day[athleteId] = states[(states.indexOf(cur) + 1) % states.length];
    return { attendance: { ...s.attendance, [date]: day } };
  }),

  // Schedule
  schedule: [],
  setSchedule: (schedule) => set({ schedule }),
  addEvent: (e) => set((s) => ({
    schedule: [...s.schedule, { ...e, id: genId(), teamId: s.activeTeamId, priority: e.type === 'Competition' ? 3 : e.type === 'Competition Week' ? 2 : 1 }],
  })),
  removeEvent: (id) => set((s) => ({ schedule: s.schedule.filter((e) => e.id !== id) })),
  importScheduleEvents: (events) => set((s) => {
    let id = Math.max(0, ...s.schedule.map((e) => e.id)) + 1;
    return {
      schedule: [...s.schedule, ...events.map((e) => ({
        ...e, id: id++, teamId: s.activeTeamId, priority: e.type === 'Competition' ? 3 : e.type === 'Competition Week' ? 2 : 1,
      }))],
    };
  }),

  // Thresholds
  customThresholds: { ...ATTENDANCE_PRESETS },
  setCustomThresholds: (t) => set({ customThresholds: t }),
}));
