import { useState } from "react";
import type { Dispatch, FormEvent } from "react";
import { montantEngage, validerAvenant } from "../domaine/avenants";
import { formaterEcart, formaterEuros } from "../domaine/montants";
import { Bouton } from "../briques/Bouton";
import { Champ } from "../briques/Champ";
import { CleValeur } from "../briques/CleValeur";
import { Surcouche } from "../briques/Surcouche";
import { Corbeille, Plus } from "../briques/icones";
import { CHIFFRES, SURTITRE } from "../briques/typo";
import type { Lot } from "../donnees/chantier";
import type { ActionDemo } from "../donnees/etat";
import { useAnnonce } from "./Annonce";

const numeroSur2 = (n: number) => String(n).padStart(2, "0");

export function PanneauLot({ lot, dispatch, surFermeture, surCertificat }: {
  lot: Lot;
  dispatch: Dispatch<ActionDemo>;
  surFermeture(): void;
  surCertificat(): void;
}) {
  const annoncer = useAnnonce();
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [erreur, setErreur] = useState<{ champ: "libelle" | "montant"; message: string } | null>(null);
  const numero = numeroSur2(lot.numero);
  const engage = montantEngage(lot.marcheHT, lot.avenants);
  const paye = lot.acomptes.reduce((s, a) => s + a, 0);
  const annonceEngage = (m: number) => annoncer(`Montant engagé du lot ${numero} : ${formaterEuros(m)}`);

  function ajouter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const v = validerAvenant(libelle, montant);
    if (!v.ok) {
      setErreur({ champ: v.champ, message: v.message });
      const cible = form.elements.namedItem(v.champ);
      if (cible instanceof HTMLElement) cible.focus();
      return;
    }
    setErreur(null);
    dispatch({ type: "ajouterAvenant", lotId: lot.id, libelle: v.libelle, montantHT: v.montantHT });
    annonceEngage(engage + v.montantHT);
    setLibelle("");
    setMontant("");
  }

  return (
    <Surcouche ouverte variante="panneau" titre={`Lot ${numero} — ${lot.intitule}`} surFermeture={surFermeture}>
      <section className="flex flex-col gap-2">
        <CleValeur cle="Entreprise" valeur={lot.entreprise} />
        <CleValeur cle="Marché HT" valeur={<span className={CHIFFRES}>{formaterEuros(lot.marcheHT)}</span>} />
        <CleValeur cle="Engagé HT" valeur={<span className={CHIFFRES}>{formaterEuros(engage)}</span>} />
        <CleValeur cle="Payé HT" valeur={<span className={CHIFFRES}>{formaterEuros(paye)}</span>} />
      </section>

      <section aria-labelledby="titre-avenants" className="flex flex-col gap-3">
        <h3 id="titre-avenants" className={SURTITRE}>Avenants</h3>
        {lot.avenants.length === 0 ? (
          <p className="text-13 text-muted">Aucun avenant : le marché vaut son montant d'origine.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {lot.avenants.map((a) => (
              <li key={a.id} className="flex items-center gap-3 border-b border-rule py-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-12 text-muted">Avenant n° {numeroSur2(a.numero)}</span>
                  <span className="text-13 [overflow-wrap:anywhere]">{a.libelle}</span>
                </div>
                <span className={`${CHIFFRES} text-13 whitespace-nowrap`}>{formaterEcart(a.montantHT)}</span>
                <Bouton
                  variante="danger"
                  taille="petite"
                  aria-label={`Supprimer l'avenant n° ${numeroSur2(a.numero)}`}
                  onClick={() => {
                    dispatch({ type: "supprimerAvenant", lotId: lot.id, avenantId: a.id });
                    annonceEngage(engage - a.montantHT);
                  }}
                >
                  <Corbeille />
                </Bouton>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={ajouter} noValidate aria-label="Ajouter un avenant" className="flex flex-col gap-3 rounded-md border border-rule bg-surface p-4">
        <h3 className={SURTITRE}>Ajouter un avenant</h3>
        <Champ
          libelle="Libellé"
          name="libelle"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          erreur={erreur?.champ === "libelle" ? erreur.message : undefined}
          autoComplete="off"
        />
        <Champ
          libelle="Montant HT"
          name="montant"
          inputMode="decimal"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          aide="En euros ; un montant négatif est une moins-value."
          erreur={erreur?.champ === "montant" ? erreur.message : undefined}
          autoComplete="off"
        />
        <Bouton type="submit" variante="principal" className="self-start">
          <Plus />
          Ajouter
        </Bouton>
      </form>

      <Bouton onClick={surCertificat} className="self-start">
        Certificat de paiement
      </Bouton>
    </Surcouche>
  );
}
