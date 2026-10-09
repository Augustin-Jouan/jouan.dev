/**
 * Accès à l'administration : un seul mot de passe, dont seule l'empreinte
 * scrypt est connue du serveur (variable ADMIN_EMPREINTE), et une session
 * sans état : un cookie qui porte son expiration et sa signature HMAC
 * (secret ADMIN_SECRET). Changer le secret déconnecte tout le monde.
 */
import { createHmac, randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const NOM_COOKIE = "admin_session";
export const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

const N = 16384;
const R = 8;
const P = 1;
const LONGUEUR_CLE = 32;

function deriver(motDePasse: string, sel: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resoudre, rejeter) =>
    scrypt(motDePasse, sel, LONGUEUR_CLE, options, (err, cle) => (err ? rejeter(err) : resoudre(cle))),
  );
}

export async function creerEmpreinte(motDePasse: string): Promise<string> {
  const sel = randomBytes(16);
  const cle = await deriver(motDePasse, sel, { N, r: R, p: P });
  return ["scrypt", N, R, P, sel.toString("base64url"), cle.toString("base64url")].join("$");
}

export async function verifierMotDePasse(motDePasse: string, empreinte: string): Promise<boolean> {
  const [algo, n, r, p, sel, cle] = empreinte.split("$");
  if (algo !== "scrypt" || !sel || !cle) return false;
  const attendu = Buffer.from(cle, "base64url");
  if (attendu.length !== LONGUEUR_CLE) return false;
  try {
    const obtenu = await deriver(motDePasse, Buffer.from(sel, "base64url"), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(obtenu, attendu);
  } catch {
    return false;
  }
}

function signature(expireLe: string, secret: string): string {
  return createHmac("sha256", secret).update(expireLe).digest("base64url");
}

export function signerSession(expireLe: number, secret: string): string {
  return `${expireLe}.${signature(String(expireLe), secret)}`;
}

export function verifierSession(valeur: string | undefined, secret: string, maintenant = Date.now()): boolean {
  if (!valeur) return false;
  const morceaux = valeur.split(".");
  if (morceaux.length !== 2) return false;
  const [expireLe, recue] = morceaux;
  if (!/^\d+$/.test(expireLe) || Number(expireLe) <= maintenant) return false;
  const attendue = Buffer.from(signature(expireLe, secret));
  const donnee = Buffer.from(recue);
  return attendue.length === donnee.length && timingSafeEqual(attendue, donnee);
}

export function secretSession(): string | null {
  const secret = process.env.ADMIN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}
