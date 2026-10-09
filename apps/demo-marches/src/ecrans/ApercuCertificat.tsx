import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { calculerCertificat, type LignesCertificat } from "../domaine/certificat";
import { formaterEuros } from "../domaine/montants";
import { Champ } from "../briques/Champ";
import { Feuille } from "../briques/Feuille";
import { Interrupteur } from "../briques/Interrupteur";
import { Surcouche } from "../briques/Surcouche";
import { Tableau } from "../briques/Tableau";
import { NOTE, SURTITRE } from "../briques/typo";
import type { Lot } from "../donnees/chantier";
import type { ActionDemo } from "../donnees/etat";
import { useAnnonce } from "./Annonce";

const TIRET = "—";
const deux = (n: number) => String(n).padStart(2, "0");

/** L'aperçu du certificat du mois : la feuille se recalcule à chaque frappe avec les règles du domaine. */
export function ApercuCertificat({ lot, dispatch, surFermeture }: {
  lot: Lot;
  dispatch: Dispatch<ActionDemo>;
  surFermeture(): void;
}) {
  const annoncer = useAnnonce();
  const [cumul, setCumul] = useState("");
  const calculer = useCallback(
    (cumulTexte: string) =>
      calculerCertificat({
        marcheHT: lot.marcheHT,
        avenants: lot.avenants.map((a) => a.montantHT),
        acomptesAnterieurs: lot.acomptes,
        tauxTVA: lot.tauxTVA,
        tauxRetenue: lot.tauxRetenue,
        caution: lot.caution,
        cumulTexte,
      }),
    [lot],
  );
  const calcul = calculer(cumul);
  // Le dernier cumul valide est retenu : en cas d'erreur, la feuille est recalculée avec lui et le lot courant (caution, avenants).
  const [cumulValide, setCumulValide] = useState<string | null>(null);
  if (calcul.ok && cumulValide !== cumul) setCumulValide(cumul);
  const affiche = calcul.ok ? calcul : cumulValide === null ? null : calculer(cumulValide);
  const l = affiche?.ok ? affiche.lignes : undefined;
  // Pas de message à l'ouverture, mais dès qu'on vide un champ déjà rempli.
  const erreur = !calcul.ok && (cumul.trim() || cumulValide !== null) ? calcul.message : undefined;

  const annonce = useRef<number | null>(null);
  const mandate = l?.mandate;
  useEffect(() => {
    if (mandate === undefined || annonce.current === mandate) return;
    annonce.current = mandate;
    annoncer(`Montant total mandaté : ${formaterEuros(mandate)}`);
  }, [mandate, annoncer]);

  const euros = (f: (x: LignesCertificat) => number) => (l ? formaterEuros(f(l)) : TIRET);
  const numero = deux(l?.numero ?? lot.acomptes.length + 1);

  return (
    <Surcouche ouverte variante="apercu" titre={`Certificat de paiement n° ${numero} — Lot ${deux(lot.numero)}`} surFermeture={surFermeture}>
      <div className="flex flex-col gap-3">
        <Champ
          libelle="Cumul des travaux réalisés HT"
          inputMode="decimal"
          autoComplete="off"
          value={cumul}
          onChange={(e) => setCumul(e.target.value)}
          erreur={erreur}
        />
        <Interrupteur libelle="Caution bancaire" actif={lot.caution} surChangement={() => dispatch({ type: "basculerCaution", lotId: lot.id })} />
      </div>

      <Feuille aria-label="Feuille du certificat">
        <h3 className={SURTITRE}>Maître d'œuvre — exemple</h3>
        <Tableau variante="certificat">
          <tbody>
            <tr><th scope="row">Montant du marché HT</th><td data-droite>{formaterEuros(lot.marcheHT)}</td></tr>
            <tr><th scope="row">Avenants HT</th><td data-droite>{formaterEuros(lot.avenants.reduce((s, a) => s + a.montantHT, 0))}</td></tr>
            <tr><th scope="row">Total HT</th><td data-droite>{euros((x) => x.totalHT)}</td></tr>
            <tr><th scope="row">TVA</th><td data-droite>{euros((x) => x.totalTVA)}</td></tr>
            <tr><th scope="row">Total TTC</th><td data-droite>{euros((x) => x.totalTTC)}</td></tr>
            <tr><th scope="row">Acomptes précédents HT</th><td data-droite>{euros((x) => x.precedentsHT)}</td></tr>
            <tr><th scope="row">Acomptes précédents TVA</th><td data-droite>{euros((x) => x.precedentsTVA)}</td></tr>
            <tr><th scope="row">Acomptes précédents TTC</th><td data-droite>{euros((x) => x.precedentsTTC)}</td></tr>
            <tr><th scope="row">Présent acompte HT</th><td data-droite>{euros((x) => x.presentHT)}</td></tr>
            <tr><th scope="row">Présent acompte TVA</th><td data-droite>{euros((x) => x.presentTVA)}</td></tr>
            <tr><th scope="row">Présent acompte TTC</th><td data-droite>{euros((x) => x.presentTTC)}</td></tr>
            <tr><th scope="row">Retenue de garantie</th><td data-droite>{euros((x) => x.retenue)}</td></tr>
            <tr data-total>
              <th scope="row">Montant total mandaté</th>
              <td data-droite data-testid="mandate">{euros((x) => x.mandate)}</td>
            </tr>
          </tbody>
        </Tableau>
      </Feuille>

      <p className={`m-0 ${NOTE}`}>Dans l'application, le certificat est émis en PDF, figé et numéroté.</p>
    </Surcouche>
  );
}
