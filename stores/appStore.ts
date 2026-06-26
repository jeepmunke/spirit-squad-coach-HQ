import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Team, Athlete, EvalLogEntry, StuntGroup, GroupLogEntry,
  Pyramid, AttendanceMap, ScheduleEvent, AttendanceThresholds, RatingDisplayMode,
  Coach, CompetitionScore, CustomRubric,
} from '@/types';
import type { ThemeColors } from '@/constants/theme';
import { ATTENDANCE_PRESETS, SKILL_LIBRARY, RATING_LEVELS } from '@/constants/skills';
import type { RatingKey } from '@/constants/skills';
import { DEFAULT_THEME_KEY } from '@/constants/theme';

const genId = () => Date.now() + Math.floor(Math.random() * 10000);

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
  customTheme: Partial<ThemeColors>;
  setThemeKey: (key: string) => void;
  setTheme: (key: string) => void;
  setCustomTheme: (t: Partial<ThemeColors>) => void;

  // Pro
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  togglePro: () => void;
  ratingDisplayMode: RatingDisplayMode;
  setRatingDisplayMode: (m: RatingDisplayMode) => void;

  // Teams
  teams: Team[];
  activeTeamId: number;
  setActiveTeamId: (id: number) => void;
  setTeams: (teams: Team[]) => void;
  addTeam: (name?: string) => void;
  updateTeam: (id: number, data: Partial<Omit<Team, 'id'>>) => void;
  removeTeam: (id: number) => void;

  // Coaches
  coaches: Coach[];
  addCoach: (data: Partial<Omit<Coach, 'id'>>) => void;
  updateCoach: (id: number, data: Partial<Omit<Coach, 'id'>>) => void;
  removeCoach: (id: number) => void;

  // Competition scores
  competitionScores: CompetitionScore[];
  addCompetitionScore: (s: Omit<CompetitionScore, 'id'>) => void;
  updateCompetitionScore: (id: number, data: Partial<Omit<CompetitionScore, 'id'>>) => void;
  removeCompetitionScore: (id: number) => void;

  // Custom rubrics (Pro)
  customRubrics: CustomRubric[];
  addCustomRubric: (r: Omit<CustomRubric, 'id'>) => void;
  removeCustomRubric: (id: string) => void;

  // Seasons
  seasons: string[];
  currentSeason: string;
  season: string;
  setSeason: (s: string) => void;
  setCurrentSeason: (s: string) => void;
  setSeasons: (seasons: string[]) => void;
  addSeason: (name?: string) => void;
  removeSeason: (name: string) => void;

  // Athletes
  athletes: Athlete[];
  setAthletes: (a: Athlete[]) => void;
  addAthlete: (a: Omit<Athlete, 'id' | 'teamId' | 'photo'>) => void;
  updateAthlete: (id: number, data: Partial<Omit<Athlete, 'id' | 'teamId'>>) => void;
  removeAthlete: (id: number) => void;
  updateAthletePhoto: (id: number, photo: string) => void;

  // Eval log
  evalLog: EvalLogEntry[];
  logRating: (params: { athleteId: number; category: string; skill: string; position?: string; rating: RatingKey }) => void;

  // N/A skills
  naSkills: Record<number, Record<string, boolean>>;
  setNaSkill: (athleteId: number, key: string, value: boolean) => void;

  // Combo/custom skill names
  comboNames: Record<string, string>;
  setComboName: (key: string, name: string) => void;
  customSkills: Record<string, string[]>;
  addCustomSkill: (category: string) => void;

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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  // Theme
  themeKey: DEFAULT_THEME_KEY,
  customTheme: { primary: '#2B2030', accent: '#E8A33D' },
  setThemeKey: (key) => set({ themeKey: key }),
  setTheme: (key) => set({ themeKey: key }),
  setCustomTheme: (t) => set({ customTheme: t }),

  // Pro
  isPro: false,
  setIsPro: (v) => set({ isPro: v }),
  togglePro: () => set((s) => ({ isPro: !s.isPro })),
  ratingDisplayMode: 'color',
  setRatingDisplayMode: (m) => set({ ratingDisplayMode: m }),

  // Teams
  teams: [
    { id: 1, name: 'Varsity Cheer', division: 'Large Varsity', level: 'Level 5', coaches: [] },
    { id: 2, name: 'JV Cheer', division: 'Medium JV', level: 'Level 3', coaches: [] },
  ],
  activeTeamId: 1,
  setActiveTeamId: (id) => set({ activeTeamId: id }),
  setTeams: (teams) => set({ teams }),
  addTeam: (name) => set((s) => ({ teams: [...s.teams, { id: genId(), name: name ?? 'New Team', division: '', level: '', coaches: [] }] })),
  updateTeam: (id, data) => set((s) => ({ teams: s.teams.map((t) => t.id === id ? { ...t, ...data } : t) })),
  removeTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),

  // Coaches
  coaches: [
    { id: 1, name: 'Coach Williams', role: 'Head Coach', email: 'williams@school.edu', phone: '555-100-2233', permissions: 'admin', teamAssignments: [{ teamId: 1, teamName: 'Varsity Cheer', season: '2026 Fall', role: 'Head Coach' }, { teamId: 1, teamName: 'Varsity Cheer', season: '2025 Fall', role: 'Head Coach' }] },
    { id: 2, name: 'Coach Martinez', role: 'Assistant Coach', email: 'martinez@school.edu', phone: '555-200-3344', permissions: 'editor', teamAssignments: [{ teamId: 1, teamName: 'Varsity Cheer', season: '2026 Fall', role: 'Assistant Coach' }] },
  ] as Coach[],
  addCoach: (data) => set((s) => ({ coaches: [...s.coaches, { id: genId(), name: '', role: '', email: '', phone: '', permissions: 'viewer', teamAssignments: [], ...data }] })),
  updateCoach: (id, data) => set((s) => ({ coaches: s.coaches.map((c) => c.id === id ? { ...c, ...data } : c) })),
  removeCoach: (id) => set((s) => ({ coaches: s.coaches.filter((c) => c.id !== id) })),

  // Competition scores
  competitionScores: [],
  addCompetitionScore: (s) => set((st) => ({ competitionScores: [...st.competitionScores, { ...s, id: genId() }] })),
  updateCompetitionScore: (id, data) => set((st) => ({ competitionScores: st.competitionScores.map((s) => s.id === id ? { ...s, ...data } : s) })),
  removeCompetitionScore: (id) => set((st) => ({ competitionScores: st.competitionScores.filter((s) => s.id !== id) })),

  // Custom rubrics
  customRubrics: [],
  addCustomRubric: (r) => set((s) => ({ customRubrics: [...s.customRubrics, { ...r, id: `custom_${genId()}` }] })),
  removeCustomRubric: (id) => set((s) => ({ customRubrics: s.customRubrics.filter((r) => r.id !== id) })),

  // Seasons
  seasons: INITIAL_SEASONS,
  currentSeason: INITIAL_CURRENT_SEASON,
  season: INITIAL_CURRENT_SEASON,
  setSeason: (season) => set({ season }),
  setCurrentSeason: (currentSeason) => set({ currentSeason }),
  setSeasons: (seasons) => set({ seasons }),
  addSeason: (name) => set((s) => ({ seasons: [...s.seasons, name ?? 'New Season'] })),
  removeSeason: (name) => set((s) => ({ seasons: s.seasons.filter((sn) => sn !== name) })),

  // Athletes
  athletes: [
    { id: 1, teamId: 1, name: 'Maddie Carter', grade: '10th', position: 'Flyer', photo: null, email: 'maddie@email.com', phone: '555-201-3344', isYouth: true, parents: [{ name: 'Lisa Carter', email: 'lisa@email.com', phone: '555-201-9988' }], emergencyName: 'Tom Carter', emergencyPhone: '555-201-7766' },
    { id: 2, teamId: 1, name: 'Jordan Lee', grade: '11th', position: 'Base', photo: null, email: 'jordan@email.com', phone: '555-330-1122', isYouth: true, parents: [{ name: 'Karen Lee', email: 'karen@email.com', phone: '555-330-4455' }], emergencyName: '', emergencyPhone: '' },
    { id: 3, teamId: 1, name: 'Ava Brooks', grade: '9th', position: 'Tumbler', photo: null, email: 'ava@email.com', phone: '555-440-2233', isYouth: false, parents: [], emergencyName: 'Mark Brooks', emergencyPhone: '555-440-9900' },
    { id: 4, teamId: 1, name: 'Sophia Diaz', grade: '12th', position: 'Back Spot', photo: null, email: 'sophia@email.com', phone: '555-550-3344', isYouth: false, parents: [], emergencyName: '', emergencyPhone: '' },
    { id: 5, teamId: 2, name: 'Riley Johnson', grade: '9th', position: 'Flyer', photo: null, email: 'riley@email.com', phone: '555-660-4455', isYouth: true, parents: [{ name: 'Dana Johnson', email: 'dana@email.com', phone: '555-660-7788' }], emergencyName: '', emergencyPhone: '' },
  ],
  setAthletes: (athletes) => set({ athletes }),
  addAthlete: (a) => set((s) => ({ athletes: [...s.athletes, { ...a, id: genId(), teamId: s.activeTeamId, photo: null, parents: (a as any).parents ?? [] }] })),
  updateAthlete: (id, data) => set((s) => ({ athletes: s.athletes.map((a) => a.id === id ? { ...a, ...data } : a) })),
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
  customSkills: { jumps: [], tumbling: [] } as Record<string, string[]>,
  addCustomSkill: (category) => set((s) => {
    const label = category === 'jumps' ? 'Jump Combo' : 'Tumble Run';
    const libSkills = (SKILL_LIBRARY as Record<string, readonly string[]>)[category] ?? [];
    const existing = [...libSkills, ...(s.customSkills[category] ?? [])].filter((sk) => sk.startsWith(label));
    return { customSkills: { ...s.customSkills, [category]: [...(s.customSkills[category] ?? []), `${label} ${existing.length + 1}`] } };
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
    }),
    {
      name: 'insync-app-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        themeKey: s.themeKey,
        customTheme: s.customTheme,
        isPro: s.isPro,
        ratingDisplayMode: s.ratingDisplayMode,
        teams: s.teams,
        activeTeamId: s.activeTeamId,
        coaches: s.coaches,
        competitionScores: s.competitionScores,
        customRubrics: s.customRubrics,
        seasons: s.seasons,
        currentSeason: s.currentSeason,
        season: s.season,
        athletes: s.athletes,
        evalLog: s.evalLog,
        naSkills: s.naSkills,
        comboNames: s.comboNames,
        customSkills: s.customSkills,
        groups: s.groups,
        groupLog: s.groupLog,
        pyramids: s.pyramids,
        attendance: s.attendance,
        schedule: s.schedule,
        customThresholds: s.customThresholds,
      }),
    },
  ),
);
