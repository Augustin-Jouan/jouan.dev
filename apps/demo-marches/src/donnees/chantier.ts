import type { Avenant } from "../domaine/avenants";
import type { Centimes } from "../domaine/montants";

export type Lot = {
  id: string;
  numero: number;
  intitule: string;
  entreprise: string;
  marcheHT: Centimes;
  avenants: Avenant[];
  /** Dernier numéro d'avenant attribué : un numéro n'est jamais réutilisé. */
  compteurAvenants: number;
  /** Acomptes déjà versés (HT), dans l'ordre des certificats. */
  acomptes: Centimes[];
  tauxTVA: number;
  tauxRetenue: number;
  caution: boolean;
  debut: string;
  fin: string;
};

const lot = (l: Omit<Lot, "compteurAvenants" | "tauxTVA" | "tauxRetenue">): Lot => ({
  ...l,
  compteurAvenants: l.avenants.length,
  tauxTVA: 20,
  tauxRetenue: 5,
});

const av = (id: string, numero: number, libelle: string, montantHT: Centimes): Avenant => ({ id, numero, libelle, montantHT });

/** Chantier entièrement inventé : aucun nom, lieu ni montant n'est réel. */
export const CHANTIER = {
  nom: "Réhabilitation de 12 logements",
  adresse: "Rue des Tilleuls",
  debut: "2026-09-07",
  fin: "2027-01-29",
  lots: [
    lot({ id: "l1", numero: 1, intitule: "Gros œuvre — maçonnerie", entreprise: "Maçonnerie Brunet", marcheHT: 14_850_000, avenants: [av("l1a1", 1, "Reprise de linteaux", 620_000)], acomptes: [4_000_000, 5_200_000], caution: true, debut: "2026-09-07", fin: "2026-10-30" }),
    lot({ id: "l2", numero: 2, intitule: "Charpente — couverture", entreprise: "Charpentes du Val", marcheHT: 6_430_000, avenants: [], acomptes: [2_000_000], caution: false, debut: "2026-10-12", fin: "2026-11-20" }),
    lot({ id: "l3", numero: 3, intitule: "Menuiseries extérieures", entreprise: "Menuiserie Lambert", marcheHT: 5_280_000, avenants: [av("l3a1", 1, "Suppression d'un châssis", -145_000)], acomptes: [], caution: false, debut: "2026-11-02", fin: "2026-11-27" }),
    lot({ id: "l4", numero: 4, intitule: "Plâtrerie — isolation", entreprise: "Atelier Rocher", marcheHT: 7_195_000, avenants: [], acomptes: [], caution: false, debut: "2026-11-16", fin: "2026-12-18" }),
    lot({ id: "l5", numero: 5, intitule: "Électricité", entreprise: "Élec Services Martin", marcheHT: 4_670_000, avenants: [av("l5a1", 1, "Prises supplémentaires", 238_000)], acomptes: [900_000], caution: false, debut: "2026-10-19", fin: "2027-01-15" }),
    lot({ id: "l6", numero: 6, intitule: "Plomberie — chauffage", entreprise: "Thermique Garnier", marcheHT: 5_840_000, avenants: [], acomptes: [850_000], caution: false, debut: "2026-10-19", fin: "2027-01-15" }),
    lot({ id: "l7", numero: 7, intitule: "Carrelage — faïence", entreprise: "Carrelages Morel", marcheHT: 1_260_000, avenants: [av("l7a1", 1, "Faïence toute hauteur des salles d'eau", 85_000)], acomptes: [300_000, 420_000], caution: false, debut: "2026-12-07", fin: "2027-01-08" }),
    lot({ id: "l8", numero: 8, intitule: "Peinture — sols souples", entreprise: "Peintures Leroy", marcheHT: 3_325_000, avenants: [], acomptes: [], caution: false, debut: "2027-01-04", fin: "2027-01-29" }),
  ],
} as const satisfies { nom: string; adresse: string; debut: string; fin: string; lots: readonly Lot[] };
