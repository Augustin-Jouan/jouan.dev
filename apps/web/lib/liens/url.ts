import { siteUrl } from "@/data/site";

/** Lien à envoyer au prospect. */
export function urlDuLien(jeton: string): string {
  return `${siteUrl}/?pour=${jeton}`;
}

/** Aperçu, relatif pour fonctionner sur tous les environnements ; ne compte pas de visite. */
export function apercuDuLien(jeton: string): string {
  return `/?pour=${jeton}&apercu=1`;
}
