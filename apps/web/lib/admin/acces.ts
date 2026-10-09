/** Vérification de la session côté serveur, dans chaque page et action de /admin. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NOM_COOKIE, secretSession, verifierSession } from "./session";

export async function sessionValide(): Promise<boolean> {
  // Lire les cookies avant tout : sans cet appel (secret absent au build),
  // Next prérendrait la page comme statique et ne vérifierait plus rien.
  const valeur = (await cookies()).get(NOM_COOKIE)?.value;
  const secret = secretSession();
  if (!secret) return false;
  return verifierSession(valeur, secret);
}

export async function exigerSession(): Promise<void> {
  if (!(await sessionValide())) redirect("/admin/connexion");
}
