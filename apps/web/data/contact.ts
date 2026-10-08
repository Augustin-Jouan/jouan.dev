export type Contact = {
  /** Adresse publique, affichée sur le site et dans les messages d'erreur. */
  email: string;
  /** Profil GitHub, aussi déclaré dans les données structurées (`sameAs`). */
  github: string;
};

export const contact: Contact = {
  email: "contact@jouan.dev",
  github: "https://github.com/Augustin-Jouan",
};
