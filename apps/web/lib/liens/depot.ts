/** Accès à la base pour les liens personnalisés et leurs visites. */
import { base } from "@/lib/base/client";
import { genererJeton } from "./jeton";
import { estNouvelleVisite, type Appareil } from "./visites";

export type AngleLien = "application" | "vitrine";
export type VisiteResume = { le: Date; appareil: Appareil; numero: number; mailEnvoye: boolean };
export type LienResume = {
  id: string;
  jeton: string;
  nom: string;
  angle: AngleLien;
  actif: boolean;
  creeLe: Date;
  /** Total réel ; `visites` est limité aux 50 plus récentes. */
  nombreVisites: number;
  visites: VisiteResume[];
};
export type VisiteEnregistree = { id: string; nom: string; numero: number; precedente: Date | null };

export async function trouverLienActif(jeton: string): Promise<{ nom: string; angle: AngleLien } | null> {
  return base().lien.findFirst({ where: { jeton, actif: true }, select: { nom: true, angle: true } });
}

export async function creerLien(nom: string, angle: AngleLien): Promise<{ jeton: string }> {
  for (let essai = 0; essai < 5; essai++) {
    const jeton = genererJeton(nom);
    try {
      await base().lien.create({ data: { jeton, nom, angle } });
      return { jeton };
    } catch (err) {
      // P2002 : jeton déjà pris (même nom, même suffixe) ; on retire au sort.
      if ((err as { code?: string }).code !== "P2002") throw err;
    }
  }
  throw new Error("Impossible de générer un jeton libre.");
}

export async function listerLiens(): Promise<LienResume[]> {
  const liens = await base().lien.findMany({
    orderBy: { creeLe: "desc" },
    select: {
      id: true,
      jeton: true,
      nom: true,
      angle: true,
      actif: true,
      creeLe: true,
      _count: { select: { visites: true } },
      visites: {
        orderBy: { le: "desc" },
        take: 50,
        select: { le: true, appareil: true, numero: true, mailEnvoye: true },
      },
    },
  });
  return liens.map(({ _count, ...lien }) => ({ ...lien, nombreVisites: _count.visites }));
}

export async function changerEtat(id: string, actif: boolean): Promise<void> {
  await base().lien.update({ where: { id }, data: { actif } });
}

export async function supprimerLien(id: string): Promise<void> {
  await base().lien.delete({ where: { id } });
}

/**
 * Enregistre une visite si le lien est actif et que la précédente date d'au
 * moins 30 minutes. Un verrou par lien (pg_advisory_xact_lock) sérialise les
 * signaux simultanés : trois onglets ouverts d'un coup font une seule visite.
 */
export async function enregistrerVisite(
  jeton: string,
  appareil: Appareil,
  maintenant: Date,
): Promise<VisiteEnregistree | null> {
  return base().$transaction(async (tx) => {
    const lien = await tx.lien.findFirst({ where: { jeton, actif: true }, select: { id: true, nom: true } });
    if (!lien) return null;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lien.id}))`;
    const derniere = await tx.visite.findFirst({
      where: { lienId: lien.id },
      orderBy: { le: "desc" },
      select: { le: true, numero: true },
    });
    if (!estNouvelleVisite(derniere?.le ?? null, maintenant)) return null;
    const visite = await tx.visite.create({
      data: { lienId: lien.id, le: maintenant, appareil, numero: (derniere?.numero ?? 0) + 1 },
      select: { id: true, numero: true },
    });
    return { id: visite.id, nom: lien.nom, numero: visite.numero, precedente: derniere?.le ?? null };
  });
}

export async function marquerMailEnvoye(id: string): Promise<void> {
  await base().visite.update({ where: { id }, data: { mailEnvoye: true } });
}

export async function purgerVisites(avant: Date): Promise<number> {
  const { count } = await base().visite.deleteMany({ where: { le: { lt: avant } } });
  return count;
}
