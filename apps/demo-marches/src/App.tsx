import { useId, useReducer, useState } from "react";
import { Onglets, PanneauOnglet } from "./briques/Onglets";
import { etatInitial, reducteur } from "./donnees/etat";
import { Annonce, useAnnonce } from "./ecrans/Annonce";
import { Coquille } from "./ecrans/Coquille";
import { Marches } from "./ecrans/Marches";

const ONGLETS = [
  { id: "marches", titre: "Marchés" },
  { id: "planning", titre: "Planning" },
];

function Demo() {
  const groupe = useId();
  const annoncer = useAnnonce();
  const [etat, dispatch] = useReducer(reducteur, undefined, etatInitial);
  const [actif, setActif] = useState("marches");
  // L'aperçu du certificat arrive avec la tâche 6 : pour l'instant on ne retient que le lot demandé.
  const [, setApercuLotId] = useState<string | null>(null);
  return (
    <Coquille
      surReinitialisation={() => {
        dispatch({ type: "reinitialiser" });
        annoncer("Démo réinitialisée.");
      }}
      enTete={<Onglets groupe={groupe} libelle="Écrans de la démo" onglets={ONGLETS} actif={actif} surChangement={setActif} />}
    >
      <PanneauOnglet groupe={groupe} id="marches" actif={actif}>
        <Marches lots={etat.lots} dispatch={dispatch} surCertificat={setApercuLotId} />
      </PanneauOnglet>
      <PanneauOnglet groupe={groupe} id="planning" actif={actif}>
        {null}
      </PanneauOnglet>
    </Coquille>
  );
}

export function App() {
  return (
    <Annonce>
      <Demo />
    </Annonce>
  );
}
