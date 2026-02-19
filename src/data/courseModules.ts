/**
 * Course modules for Université du Bénin
 * Extracted from curriculum syllabus - MATHEMATICS ONLY
 */

export interface CourseModule {
  code: string;
  name: string;
  topics: string[];
}

export const COURSE_MODULES: CourseModule[] = [
  {
    code: "MTH1220",
    name: "Structures algébriques",
    topics: [
      "Groupes et morphismes",
      "Anneaux et idéaux",
      "Corps et polynômes",
      "Fractions rationnelles",
      "Divisibilité",
    ],
  },
  {
    code: "PHY1223",
    name: "Optique générale",
    topics: [
      "Lentilles et dioptres",
      "Optique géométrique",
      "Optique physique",
    ],
  },
];

/**
 * Curriculum-specific button topics (curated list, all math/physics)
 * These are the ONLY topics shown in the UI question buttons
 */
export const CURRICULUM_TOPICS = [
  "Divisibilité",
  "Lentilles et dioptres",
  "Fractions rationnelles",
  "Optique physique",
  "Optique géométrique",
];

/**
 * Get curated curriculum topics for UI buttons
 */
export function getCurriculumTopics(): string[] {
  return CURRICULUM_TOPICS;
}

/**
 * Get all available topics from all courses
 */
export function getAllTopics(): string[] {
  const topics = new Set<string>();
  COURSE_MODULES.forEach((module) => {
    module.topics.forEach((topic) => topics.add(topic));
  });
  return Array.from(topics);
}

/**
 * Pick N random topics from curriculum (for diversity)
 */
export function getRandomTopics(count: number = 5): string[] {
  const all = getCurriculumTopics();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, all.length));
}

/**
 * Get a random module code
 */
export function getRandomModuleCode(): string {
  return COURSE_MODULES[Math.floor(Math.random() * COURSE_MODULES.length)].code;
}
