/**
 * Course modules for Université du Bénin
 * Extracted from curriculum syllabus
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
      "Optique géométrique",
      "Réfraction et réflexion",
      "Lentilles et dioptres",
      "Optique physique",
      "Polarisation",
      "Diffraction",
      "Interférences",
    ],
  },
  {
    code: "BIO1225",
    name: "Biologie cellulaire",
    topics: [
      "Structures cellulaires",
      "Métabolisme",
      "Génétique",
      "Évolution",
    ],
  },
];

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
 * Pick N random topics from all courses
 */
export function getRandomTopics(count: number = 5): string[] {
  const all = getAllTopics();
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, all.length));
}

/**
 * Get a random module code
 */
export function getRandomModuleCode(): string {
  return COURSE_MODULES[Math.floor(Math.random() * COURSE_MODULES.length)].code;
}
