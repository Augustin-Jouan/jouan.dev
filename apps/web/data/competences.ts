/**
 * Compétences, groupées par thème : CV en terminal et `/api/me` (sous-projet 7).
 * `data/competences.test.ts` vérifie que chaque techno citée par une réalisation
 * ou une étude de cas y figure.
 */
export type GroupeCompetences = { nom: string; elements: string[] };

export const competences: GroupeCompetences[] = [
  { nom: "Front", elements: ["Next.js", "React", "TypeScript", "Tailwind CSS"] },
  { nom: "Back", elements: ["Node.js", "Hono", "WebSocket"] },
  { nom: "Données", elements: ["PostgreSQL", "Prisma"] },
  { nom: "Infrastructure", elements: ["Docker", "GitHub Actions", "Coolify"] },
  { nom: "Qualité", elements: ["Vitest", "Playwright"] },
];
