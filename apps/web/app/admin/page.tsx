import { BoutonCopier } from "./BoutonCopier";
import { BoutonSupprimer } from "./BoutonSupprimer";
import { NouveauLien } from "./NouveauLien";
import { changerEtatAction } from "./actions";
import { seDeconnecter } from "./connexion/actions";
import { libellesAngle } from "@/data/accueil";
import { exigerSession } from "@/lib/admin/acces";
import { baseConfiguree } from "@/lib/base/client";
import { listerLiens, type LienResume } from "@/lib/liens/depot";
import { ordinalVisite } from "@/lib/liens/mail-visite";
import { dateHeureParis, ilYA } from "@/lib/liens/temps";
import { apercuDuLien, urlDuLien } from "@/lib/liens/url";

export const dynamic = "force-dynamic";

async function chargerLiens(): Promise<LienResume[] | null> {
  if (!baseConfiguree()) return null;
  try {
    return await listerLiens();
  } catch (err) {
    console.error("[admin] Lecture des liens impossible :", err);
    return null;
  }
}

export default async function PageAdmin() {
  await exigerSession();
  const liens = await chargerLiens();
  const maintenant = new Date();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-serif text-4xl">Liens personnalisés</h1>
        <form action={seDeconnecter}>
          <button className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre">
            Se déconnecter
          </button>
        </form>
      </div>

      {liens === null ? (
        <p role="alert" className="rounded-2xl border border-brique p-4 text-brique">
          Base de données indisponible.
        </p>
      ) : (
        <>
          <NouveauLien />
          {liens.length === 0 ? (
            <p className="text-encre-douce">Aucun lien pour l&apos;instant.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {liens.map((lien) => (
                <li key={lien.id} className="flex flex-col gap-3 rounded-2xl border border-trait p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="min-w-0 break-words font-serif text-2xl">{lien.nom}</h2>
                    <p className="text-sm text-encre-douce">
                      {libellesAngle[lien.angle]} · {lien.actif ? "actif" : "désactivé"} ·{" "}
                      {lien.visites.length === 0
                        ? "aucune visite"
                        : `${lien.visites.length} visite${lien.visites.length > 1 ? "s" : ""}, la dernière ${ilYA(lien.visites[0].le, maintenant)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <BoutonCopier texte={urlDuLien(lien.jeton)} />
                    <a href={apercuDuLien(lien.jeton)} target="_blank" rel="noopener" className="underline underline-offset-4">
                      Aperçu<span className="sr-only"> (nouvel onglet)</span>
                    </a>
                    <form action={changerEtatAction}>
                      <input type="hidden" name="id" value={lien.id} />
                      <input type="hidden" name="actif" value={String(!lien.actif)} />
                      <button className="underline underline-offset-4">{lien.actif ? "Désactiver" : "Réactiver"}</button>
                    </form>
                    <BoutonSupprimer id={lien.id} nom={lien.nom} />
                  </div>
                  {lien.visites.length > 0 && (
                    <details>
                      <summary className="cursor-pointer text-sm">Visites</summary>
                      <ul className="mt-2 flex flex-col gap-1 text-sm text-encre-douce">
                        {lien.visites.map((v) => (
                          <li key={v.numero}>
                            {ordinalVisite(v.numero)} — {dateHeureParis(v.le)}, sur {v.appareil}
                            {v.mailEnvoye ? "" : " (mail non envoyé)"}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
