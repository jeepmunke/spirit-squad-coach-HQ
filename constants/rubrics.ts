import type { RubricCategory } from '@/types';

export interface BuiltInRubric {
  id: string;
  name: string;
  shortName: string;
  organization: string;
  totalPoints: number;
  categories: RubricCategory[];
}

export const BUILT_IN_RUBRICS: BuiltInRubric[] = [
  {
    id: 'usasf_allstar',
    name: 'Varsity All-Star / United',
    shortName: 'USASF',
    organization: 'USASF / Varsity',
    totalPoints: 100,
    categories: [
      {
        id: 'building',
        name: 'Building',
        maxPoints: 25,
        subcategories: [
          { id: 'building_difficulty', name: 'Difficulty', maxPoints: 15 },
          { id: 'building_execution', name: 'Execution & Precision', maxPoints: 10 },
        ],
      },
      {
        id: 'pyramids_tosses',
        name: 'Pyramids & Tosses',
        maxPoints: 20,
        subcategories: [
          { id: 'pyramids_difficulty', name: 'Difficulty', maxPoints: 12 },
          { id: 'pyramids_execution', name: 'Execution & Precision', maxPoints: 8 },
        ],
      },
      {
        id: 'jumps',
        name: 'Jumps',
        maxPoints: 10,
        subcategories: [
          { id: 'jumps_difficulty', name: 'Difficulty', maxPoints: 6 },
          { id: 'jumps_execution', name: 'Execution', maxPoints: 4 },
        ],
      },
      {
        id: 'tumbling',
        name: 'Tumbling',
        maxPoints: 25,
        subcategories: [
          { id: 'tumbling_difficulty', name: 'Difficulty', maxPoints: 15 },
          { id: 'tumbling_execution', name: 'Execution', maxPoints: 10 },
        ],
      },
      { id: 'motion_quality', name: 'Motion Quality', maxPoints: 10 },
      { id: 'overall_performance', name: 'Overall Performance', maxPoints: 10 },
    ],
  },
  {
    id: 'uca_traditional',
    name: 'UCA Traditional School',
    shortName: 'UCA',
    organization: 'Universal Cheerleaders Association',
    totalPoints: 100,
    categories: [
      {
        id: 'cheer_skills',
        name: 'Cheerleading Skills',
        maxPoints: 50,
        subcategories: [
          { id: 'skills_stunts', name: 'Stunts', maxPoints: 20 },
          { id: 'skills_pyramids', name: 'Pyramids', maxPoints: 10 },
          { id: 'skills_tumbling', name: 'Tumbling', maxPoints: 10 },
          { id: 'skills_jumps', name: 'Jumps', maxPoints: 10 },
        ],
      },
      {
        id: 'performance',
        name: 'Performance',
        maxPoints: 30,
        subcategories: [
          { id: 'perf_motion', name: 'Motion Sharpness', maxPoints: 10 },
          { id: 'perf_timing', name: 'Timing & Synchronization', maxPoints: 10 },
          { id: 'perf_crowd', name: 'Crowd Leading Effectiveness', maxPoints: 10 },
        ],
      },
      {
        id: 'appearance',
        name: 'Overall Appearance',
        maxPoints: 20,
        subcategories: [
          { id: 'appear_uniformity', name: 'Uniformity & Appearance', maxPoints: 10 },
          { id: 'appear_impression', name: 'Overall Impression', maxPoints: 10 },
        ],
      },
    ],
  },
  {
    id: 'varsity_gameday',
    name: 'Varsity Game Day',
    shortName: 'Game Day',
    organization: 'Varsity',
    totalPoints: 100,
    categories: [
      {
        id: 'sideline',
        name: 'Sideline Effectiveness',
        maxPoints: 40,
        subcategories: [
          { id: 'sideline_crowd', name: 'Crowd Interaction & Engagement', maxPoints: 20 },
          { id: 'sideline_cheer', name: 'Cheer / Chant Performance', maxPoints: 20 },
        ],
      },
      {
        id: 'spirit',
        name: 'Spirit Building',
        maxPoints: 30,
        subcategories: [
          { id: 'spirit_energy', name: 'Energy & Enthusiasm', maxPoints: 15 },
          { id: 'spirit_team', name: 'Team Spirit & Sportsmanship', maxPoints: 15 },
        ],
      },
      {
        id: 'routine',
        name: 'Routine Performance',
        maxPoints: 30,
        subcategories: [
          { id: 'routine_tumbling', name: 'Tumbling', maxPoints: 10 },
          { id: 'routine_stunts', name: 'Stunts', maxPoints: 10 },
          { id: 'routine_execution', name: 'Overall Execution', maxPoints: 10 },
        ],
      },
    ],
  },
  {
    id: 'nfhs_state',
    name: 'NFHS State Rubric',
    shortName: 'NFHS',
    organization: 'National Federation of State High School Associations',
    totalPoints: 100,
    categories: [
      {
        id: 'technical',
        name: 'Technical Skills',
        maxPoints: 40,
        subcategories: [
          { id: 'tech_stunts', name: 'Stunts & Pyramids', maxPoints: 15 },
          { id: 'tech_tumbling', name: 'Tumbling', maxPoints: 15 },
          { id: 'tech_jumps', name: 'Jumps', maxPoints: 10 },
        ],
      },
      {
        id: 'perf_quality',
        name: 'Performance Quality',
        maxPoints: 35,
        subcategories: [
          { id: 'pq_timing', name: 'Timing & Synchronization', maxPoints: 15 },
          { id: 'pq_motion', name: 'Motion Quality', maxPoints: 10 },
          { id: 'pq_overall', name: 'Overall Performance', maxPoints: 10 },
        ],
      },
      {
        id: 'safety',
        name: 'Safety',
        maxPoints: 25,
        subcategories: [
          { id: 'safety_execution', name: 'Safe Execution of Skills', maxPoints: 15 },
          { id: 'safety_spotting', name: 'Proper Spotting Technique', maxPoints: 10 },
        ],
      },
    ],
  },
];
