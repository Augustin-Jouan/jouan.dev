export type Contact = {
  /** Adresse publique, affichée sur le site et dans les messages d'erreur. */
  email: string;
  /** Profil GitHub, aussi déclaré dans les données structurées (`sameAs`). */
  github: string;
  /** Profil LinkedIn, aussi déclaré dans les données structurées (`sameAs`). */
  linkedin: string;
};

export const contact: Contact = {
  email: "augustin@jouan.dev",
  github: "https://github.com/Augustin-Jouan",
  linkedin: "https://www.linkedin.com/in/augustinjouan",
};
