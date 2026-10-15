/**
 * Le trait conducteur de l'accueil (spec docs/superpowers/specs/2026-10-14-trait-conducteur-design.md) :
 * un calque SVG par-dessus la page, dont le trait s'allonge avec le défilement et allume au passage les
 * étapes de la Méthode, les logos du parcours puis le bouton d'envoi. Chargé à part, après l'affichage
 * (components/accueil/TraitConducteur.tsx).
 *
 * Les points de passage sont lus dans la page (sélecteurs écrits ici en clair : importer `data/` ferait
 * un morceau de JS de plus). Aucune lecture de position pendant le défilement : seulement aux recalculs.
 */
import { LIGNE_DE_LECTURE, longueurPour, pointA } from "./progression";
import { tracer, type Boite, type Cercle, type Cible, type Reperes, type Trace } from "./trace";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-defilement.mjs). */
export const MARQUEUR_TRAIT = "trait-conducteur:v1";

const SVG = "http://www.w3.org/2000/svg";

function boite(el: Element): Boite {
  const r = el.getBoundingClientRect();
  return { gauche: r.left + scrollX, haut: r.top + scrollY, droite: r.right + scrollX, bas: r.bottom + scrollY };
}

/** Image ronde (photo, logo) : son centre et son rayon. */
function cercle(el: Element): Cercle {
  const b = boite(el);
  return { x: (b.gauche + b.droite) / 2, y: (b.haut + b.bas) / 2, r: (b.droite - b.gauche) / 2 };
}

/** Repères mesurés dans la page, ou null s'il en manque un : pas de trait. */
export function lireReperes(): Reperes | null {
  const portrait = document.querySelector('[data-trait="portrait"]');
  const offre = document.getElementById("offre");
  const titreMethode = document.querySelector("#methode h2");
  const fil = document.querySelector(".methode-fil");
  const noeuds = [...document.querySelectorAll(".methode-noeud")];
  const logos = [...document.querySelectorAll('[data-trait="logo"] img')];
  const envoi = document.querySelector('[data-trait="envoi"]');
  const colonneSignature = document.querySelector('[data-trait="signature"]');
  if (!portrait || !offre || !titreMethode || !fil || noeuds.length !== 5 || !envoi) return null;

  const ordinateur = window.matchMedia("(width >= 64rem)").matches;
  const f = boite(fil);
  const o = boite(offre);
  return {
    largeur: document.documentElement.clientWidth,
    hauteurEcran: window.innerHeight,
    ordinateur,
    marge: titreMethode.getBoundingClientRect().left,
    portrait: cercle(portrait),
    offreY: (o.haut + o.bas) / 2,
    noeuds: noeuds.map((n) => {
      const b = boite(n);
      return { x: (b.gauche + b.droite) / 2, y: (b.haut + b.bas) / 2 };
    }),
    fil: ordinateur
      ? { debut: { x: f.gauche, y: (f.haut + f.bas) / 2 }, fin: { x: f.droite, y: (f.haut + f.bas) / 2 } }
      : { debut: { x: (f.gauche + f.droite) / 2, y: f.haut }, fin: { x: (f.gauche + f.droite) / 2, y: f.bas } },
    logos: logos.map(cercle),
    envoi: boite(envoi),
    finLecture: document.documentElement.scrollHeight - window.innerHeight * (1 - LIGNE_DE_LECTURE),
    // Sous le dernier élément de la colonne (l'adresse), jusqu'en bas de la colonne.
    signature:
      colonneSignature?.lastElementChild && ordinateur
        ? { ...boite(colonneSignature), haut: boite(colonneSignature.lastElementChild).bas }
        : undefined,
  };
}

/** Démarre le trait ; renvoie la fonction qui l'arrête et retire son calque (les allumages restent). */
export function demarrerTrait(): () => void {
  const calque = document.createElement("div");
  calque.className = "trait-calque";
  calque.setAttribute("aria-hidden", "true");
  const svg = document.createElementNS(SVG, "svg");
  // Le halo est un second tracé, plus large : un filtre (flou) sur un trait de toute la page ferait
  // redessiner une immense zone à chaque image et diviserait la fluidité par quatre.
  const halo = document.createElementNS(SVG, "path");
  halo.setAttribute("class", "trait-halo");
  const ligne = document.createElementNS(SVG, "path");
  ligne.setAttribute("class", "trait-ligne");
  const tete = document.createElementNS(SVG, "circle");
  tete.setAttribute("class", "trait-tete");
  tete.setAttribute("r", "4");
  svg.append(halo, ligne, tete);
  calque.append(svg);
  document.body.append(calque);

  // La Méthode : le trait n'en prend la main que si elle attend encore son allumage.
  const frise = document.querySelector<HTMLElement>(".methode-frise");
  const methodeGeree = !!frise?.hasAttribute("data-animation") && !frise.querySelector("[data-allumee]");
  if (methodeGeree) frise!.setAttribute("data-trait", "");

  function element(cible: Cible): Element | null | undefined {
    if (cible.type === "envoi") return document.querySelector('[data-trait="envoi"]');
    if (cible.type === "portrait") return document.querySelector('[data-trait="portrait"]');
    if (cible.type === "logo") return document.querySelectorAll('[data-trait="logo"]')[cible.indice];
    return methodeGeree ? frise!.querySelectorAll(".methode-etape")[cible.indice] : null;
  }

  let trace: Trace | null = null;

  function mettreAJour() {
    if (!trace) return;
    const l = longueurPour(scrollY + innerHeight * LIGNE_DE_LECTURE, trace.reperes);
    halo.style.strokeDashoffset = ligne.style.strokeDashoffset = String(trace.longueur - l);
    const p = pointA(l, trace.echantillons, trace.longueur);
    // Avant de défiler, le point attend déjà en haut de l'anneau de la photo.
    tete.setAttribute("transform", `translate(${p.x} ${p.y})`);
    for (const { l: seuil, cible } of trace.allumables) {
      if (l < seuil) break;
      const el = element(cible);
      if (el && !el.hasAttribute("data-allumee")) {
        el.setAttribute("data-allumee", "");
        if (cible.type === "etape" && cible.indice === 4) frise!.setAttribute("data-complete", "");
      }
    }
  }

  function recalculer() {
    const reperes = lireReperes();
    trace = reperes ? tracer(reperes) : null;
    calque.hidden = !trace;
    if (!trace) return;
    const contact = document.getElementById("contact");
    const hauteur = contact ? boite(contact).bas : trace.echantillons.at(-1)!.y + 100;
    calque.style.height = `${hauteur}px`;
    calque.dataset.variante = trace.variante;
    svg.setAttribute("width", String(reperes!.largeur));
    svg.setAttribute("height", String(hauteur));
    for (const chemin of [halo, ligne]) {
      chemin.setAttribute("d", trace.d);
      chemin.setAttribute("pathLength", String(trace.longueur));
      chemin.style.strokeDasharray = `${trace.longueur} ${trace.longueur}`;
    }
  }

  // Une seule mise à jour par image ; un recalcul la précède quand la mise en page a changé.
  let image = 0;
  let aRecalculer = true;
  const demander = (recalcul = false) => {
    aRecalculer ||= recalcul;
    image ||= requestAnimationFrame(() => {
      image = 0;
      if (aRecalculer) {
        aRecalculer = false;
        recalculer();
      }
      mettreAJour();
    });
  };
  const surDefilement = () => demander();
  const surMiseEnPage = () => demander(true);

  addEventListener("scroll", surDefilement, { passive: true });
  addEventListener("resize", surMiseEnPage);
  const observateurTaille = new ResizeObserver(surMiseEnPage);
  observateurTaille.observe(document.body);
  document.fonts?.ready.then(surMiseEnPage, () => {});

  // Pendant l'intro (et quand on la rejoue), le trait se cache.
  const fond = document.querySelector(".fond-accueil");
  const suivreIntro = () => {
    calque.style.opacity = fond?.getAttribute("data-intro") === "en-cours" ? "0" : "";
  };
  const observateurIntro = new MutationObserver(suivreIntro);
  if (fond) observateurIntro.observe(fond, { attributes: true, attributeFilter: ["data-intro"] });
  suivreIntro();
  demander(true);

  return () => {
    cancelAnimationFrame(image);
    removeEventListener("scroll", surDefilement);
    removeEventListener("resize", surMiseEnPage);
    observateurTaille.disconnect();
    observateurIntro.disconnect();
    calque.remove();
    frise?.removeAttribute("data-trait");
  };
}
