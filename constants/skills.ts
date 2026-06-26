export const SKILL_LIBRARY = {
  jumps: [
    'Double Nine', 'Herkie', 'Hurdler', 'Jump Combo 1', 'Jump Combo 2',
    'Pike', 'Spread Eagle', 'Toe Touch', 'Tuck Jump',
  ],
  tumbling: [
    'Aerial', 'Back Handspring', 'Back Tuck', 'Back Walkover', 'Cartwheel',
    'Forward Roll', 'Roundoff', 'Standing Tuck', 'Tumble Run 1', 'Tumble Run 2', 'Valdez',
  ],
  stunting: [
    'Basket Toss', 'Extension', 'Full Twist Basket', 'Heel Stretch', 'Liberty',
    'Prep', 'Rock Stunt', 'Scorpion', 'Thigh Stand',
  ],
  dance: [
    'Body Control', 'Crowd Leading', 'Full Routine', 'Prep Routine', 'Sharpness', 'Timing',
  ],
  motions: [
    'Broken T', 'Clap', 'Daggers', 'High V', 'Low V', 'Punch', 'T Motion', 'Touchdown',
  ],
} as const;

export type SkillCategory = keyof typeof SKILL_LIBRARY;

export const COMBO_SKILLS: Record<string, string[]> = {
  jumps: ['Jump Combo 1', 'Jump Combo 2'],
  tumbling: ['Tumble Run 1', 'Tumble Run 2'],
};

export const BASE_POSITIONS = [
  'Base', 'Flyer', 'Front Spot', 'Back Spot', 'Double Back', 'Side',
] as const;

export type StuntPosition = typeof BASE_POSITIONS[number];

export const RATING_LEVELS = [
  { key: 'na',          label: 'N/A',         numeric: null, color: '#C4C4C4' },
  { key: 'not_started', label: 'Not Started',  numeric: 0,    color: '#888888' },
  { key: 'working_on',  label: 'Working On',   numeric: 1,    color: '#D9667A' },
  { key: 'consistent',  label: 'Consistent',   numeric: 2,    color: '#E8A33D' },
  { key: 'comp_ready',  label: 'Comp Ready',   numeric: 3,    color: '#4CAF7D' },
] as const;

export type RatingKey = typeof RATING_LEVELS[number]['key'];

export const EVENT_TYPES = ['Practice', 'Competition Week', 'Competition', 'Custom'] as const;
export type EventType = typeof EVENT_TYPES[number];

export const EVENT_PRIORITY: Record<EventType, number> = {
  'Practice': 1,
  'Competition Week': 2,
  'Competition': 3,
  'Custom': 1,
};

export const EVENT_TYPE_COLOR: Record<EventType, string> = {
  'Practice': '#4CAF7D',
  'Competition Week': '#E8A33D',
  'Competition': '#D9667A',
  'Custom': '#5B9BD5',
};

export const EVENT_TYPE_ICON: Record<EventType, string> = {
  'Practice': '🏃',
  'Competition Week': '⚡',
  'Competition': '🏆',
  'Custom': '📅',
};

export const ATTENDANCE_PRESETS = {
  yellowAbsences: 2,
  redAbsences: 3,
  yellowPct: 85,
  redPct: 75,
};

export function ratingInfo(key: string) {
  return RATING_LEVELS.find((r) => r.key === key) ?? RATING_LEVELS[1];
}

export function ratingColor(numeric: number | null | undefined): string {
  if (numeric === null || numeric === undefined) return '#C4C4C4';
  if (numeric === 0) return '#888888';
  if (numeric === 1) return '#D9667A';
  if (numeric === 2) return '#E8A33D';
  return '#4CAF7D';
}

export function numericRating(key: string): number {
  return RATING_LEVELS.find((r) => r.key === key)?.numeric ?? 0;
}
