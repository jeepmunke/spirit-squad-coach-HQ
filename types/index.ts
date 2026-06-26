import type { RatingKey, StuntPosition, EventType } from '@/constants/skills';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface Team {
  id: number;
  name: string;
  division: string;
  level: string;
  coaches: string[];
}

// ─── Season ───────────────────────────────────────────────────────────────────

export interface Season {
  id: number;
  teamId: number;
  label: string;
  isCurrent: boolean;
}

// ─── Athlete ──────────────────────────────────────────────────────────────────

export interface Parent {
  name: string;
  email: string;
  phone: string;
}

export interface Athlete {
  id: number;
  teamId: number;
  name: string;
  grade: string;
  position: string;
  photo: string | null;
  email: string;
  phone: string;
  isYouth: boolean;
  parents: Parent[];
  emergencyName: string;
  emergencyPhone: string;
}

// ─── Evaluation Log ───────────────────────────────────────────────────────────

export interface EvalLogEntry {
  id: number;
  athleteId: number;
  category: string;
  skill: string;
  position?: StuntPosition;
  rating: RatingKey;
  date: string;
  season: string;
}

// ─── Stunt Group ──────────────────────────────────────────────────────────────

export interface GroupSlot {
  slotId: string;
  position: string;
  label: string;
  athleteId: number | null;
}

export interface StuntGroup {
  id: number;
  teamId: number;
  name: string;
  slots: GroupSlot[];
}

export interface GroupLogEntry {
  id: number;
  groupId: number;
  skill: string;
  rating: RatingKey;
  date: string;
  season: string;
}

// ─── Pyramid ──────────────────────────────────────────────────────────────────

export interface PyramidSlot {
  slotId: string;
  position: string;
  label: string;
  athleteId: number | null;
}

export interface PyramidLayer {
  layerId: string;
  layerNumber: number;
  heightLabel: string;
  slots: PyramidSlot[];
}

export interface PyramidSection {
  sectionId: string;
  sectionNumber: number;
  name: string;
  layers: PyramidLayer[];
}

export interface Pyramid {
  id: number;
  teamId: number;
  name: string;
  sections: PyramidSection[];
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'excused';

// { [date]: { [athleteId]: AttendanceStatus } }
export type AttendanceMap = Record<string, Record<number, AttendanceStatus>>;

// ─── Schedule ─────────────────────────────────────────────────────────────────

export interface ScheduleEvent {
  id: number;
  teamId: number;
  name: string;
  date: string;
  time: string;
  type: EventType;
  priority: number;
}

// ─── Coach ────────────────────────────────────────────────────────────────────

export type CoachPermission = 'admin' | 'editor' | 'viewer';

export interface CoachTeamAssignment {
  teamId: number;
  teamName: string;
  season: string;
  role: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Coach {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  permissions: CoachPermission;
  teamAssignments: CoachTeamAssignment[];
  emergencyContacts?: EmergencyContact[];
}

// ─── Competition Scoring ──────────────────────────────────────────────────────

export interface CompetitionScore {
  id: number;
  teamId: number;
  season: string;
  competitionName: string;
  date: string;
  rubricId: string;
  scores: Record<string, number>;
  totalScore: number;
  notes: string;
}

export interface RubricSubcategory {
  id: string;
  name: string;
  maxPoints: number;
}

export interface RubricCategory {
  id: string;
  name: string;
  maxPoints: number;
  subcategories?: RubricSubcategory[];
}

export interface CustomRubric {
  id: string;
  name: string;
  totalPoints: number;
  categories: RubricCategory[];
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AttendanceThresholds {
  yellowAbsences: number;
  redAbsences: number;
  yellowPct: number;
  redPct: number;
}

export type RatingDisplayMode = 'color' | 'number' | 'both';
