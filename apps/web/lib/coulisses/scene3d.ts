/**
 * Vue 3D des coulisses, chargée par `import()` au clic sur « Voir en 3D » :
 * ce module et Three.js forment des morceaux à part (verifier-taille-3d), jamais
 * chargé sans clic. Blocs = nœuds, étiquettes HTML nettes (CSS2DRenderer),
 * paquets lumineux au rythme des latences mesurées ; orbite à la souris ou au
 * doigt, zoom borné. Rendu en pause quand l'onglet est caché ou la scène hors
 * de l'écran ; tout est libéré par `arreter()`, contexte WebGL compris. La
 * caméra recule sur un cadre étroit (mobile) pour garder toute la scène dans le
 * champ ; rendu au processeur : résolution réduite.
 */
import {
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  DirectionalLight,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { IdNoeud, Liaison, Noeud } from "@/data/architecture";
import { COULEURS_3D } from "./couleurs3d";
import { CHAMP_VERTICAL, distanceCamera, periodePaquet, position3d } from "./geometrie3d";
import type { Serie } from "./magasin";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-3d.mjs). */
export const MARQUEUR_3D = "scene-3d:v1";

const COULEURS = COULEURS_3D;

export type OptionsScene = {
  conteneur: HTMLElement;
  noeuds: readonly Noeud[];
  liaisons: readonly Liaison[];
  /** Dernières latences, lues à chaque image. */
  latences(): Record<Serie, number | null>;
  mouvementReduit: boolean;
  /** Nœud surligné dès la création (la scène est recréée si le mouvement réduit change). */
  choisi: IdNoeud;
  surChoix(id: IdNoeud): void;
  /** Contexte WebGL perdu une fois la scène montée : l'appelant revient en 2D. */
  surPerte(): void;
};

export type Scene3D = { readonly marqueur: string; choisir(id: IdNoeud): void; arreter(): void };

/**
 * Rendu au processeur (SwiftShader, llvmpipe, softpipe, pilote de base de Windows) ?
 * Même liste que `estRenduLogiciel` de lib/encre/moteur.ts, recopiée : un module
 * partagé avec l'intro deviendrait un morceau à part, hors du budget 3D.
 */
function renduLogiciel(gl: WebGL2RenderingContext): boolean {
  const brut = gl.getParameter(gl.RENDERER);
  let nom = typeof brut === "string" && brut !== "WebKit WebGL" ? brut : "";
  // Extension demandée seulement si besoin (Chrome) : Firefox avertit dans la console sinon.
  if (!nom) {
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    nom = extension ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)) : "";
  }
  return /swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(nom);
}

type Paquet = { mesh: Mesh; de: Vector3; vers: Vector3; serie?: Serie; phase: number };

/** Lève une erreur si WebGL est indisponible ou si la construction échoue : l'appelant revient en 2D. */
export function creerScene(o: OptionsScene): Scene3D {
  const rendu = new WebGLRenderer({ antialias: true, alpha: true });
  try {
    return construire(o, rendu);
  } catch (erreur) {
    // Rien ne doit rester derrière une construction interrompue : canevas, étiquettes, contexte.
    rendu.setAnimationLoop(null);
    rendu.forceContextLoss();
    rendu.dispose();
    o.conteneur.replaceChildren();
    throw erreur;
  }
}

function construire(o: OptionsScene, rendu: WebGLRenderer): Scene3D {
  const { conteneur } = o;
  const largeur = () => Math.max(1, conteneur.clientWidth);
  const hauteur = () => Math.max(1, conteneur.clientHeight);

  // Au processeur (SwiftShader, llvmpipe…), une pleine résolution ralentirait toute la page.
  const logiciel = renduLogiciel(rendu.getContext() as WebGL2RenderingContext);
  rendu.setPixelRatio(logiciel ? 1 : Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  conteneur.appendChild(rendu.domElement);

  const etiquettes = new CSS2DRenderer();
  etiquettes.setSize(largeur(), hauteur());
  Object.assign(etiquettes.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  conteneur.appendChild(etiquettes.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(CHAMP_VERTICAL, largeur() / hauteur(), 0.1, 100);
  let distance = distanceCamera(o.noeuds, camera.aspect);
  camera.position.set(0, distance / 7, distance);
  scene.add(new AmbientLight(0xffffff, 1.6));
  const soleil = new DirectionalLight(0xffffff, 1.2);
  soleil.position.set(4, 8, 6);
  scene.add(soleil);

  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = 6;
  controles.maxDistance = Math.max(24, distance * 1.4);
  controles.autoRotate = !o.mouvementReduit;
  controles.autoRotateSpeed = 0.6;

  const geometrieBloc = new BoxGeometry(2.4, 0.9, 0.9);
  const blocs = new Map<IdNoeud, Mesh<BoxGeometry, MeshStandardMaterial>>();
  for (const n of o.noeuds) {
    const bloc = new Mesh(geometrieBloc, new MeshStandardMaterial({ color: COULEURS.bloc }));
    bloc.position.set(...position3d(n));
    bloc.userData.id = n.id;
    const etiquette = document.createElement("span");
    etiquette.textContent = n.nom;
    etiquette.className = "rounded bg-surface px-1.5 py-0.5 text-xs font-semibold text-texte";
    bloc.add(new CSS2DObject(etiquette));
    scene.add(bloc);
    blocs.set(n.id, bloc);
  }

  const materielLigne = new LineBasicMaterial({ color: COULEURS.liaison });
  const geometriePaquet = new SphereGeometry(0.09, 12, 12);
  const materielPaquet = new MeshBasicMaterial({ color: COULEURS.actif });
  const lignes: BufferGeometry[] = [];
  const paquets: Paquet[] = [];
  for (const l of o.liaisons) {
    const de = blocs.get(l.de)!.position.clone();
    const vers = blocs.get(l.vers)!.position.clone();
    const geometrie = new BufferGeometry().setFromPoints([de, vers]);
    lignes.push(geometrie);
    scene.add(new Line(geometrie, materielLigne));
    if (o.mouvementReduit) continue;
    const mesh = new Mesh(geometriePaquet, materielPaquet);
    scene.add(mesh);
    paquets.push({ mesh, de, vers, serie: l.mesure, phase: Math.random() });
  }

  const choisir = (id: IdNoeud) => {
    for (const [cle, bloc] of blocs) bloc.material.color.set(cle === id ? COULEURS.actif : COULEURS.bloc);
  };
  choisir(o.choisi);

  // Un clic sans glisser sur un bloc le choisit (le glisser fait tourner la scène).
  const rayon = new Raycaster();
  const pointeur = new Vector2();
  let depart: { x: number; y: number } | null = null;
  const surBas = (e: PointerEvent) => {
    depart = { x: e.clientX, y: e.clientY };
  };
  const surHaut = (e: PointerEvent) => {
    if (!depart || Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 5) return;
    const r = rendu.domElement.getBoundingClientRect();
    pointeur.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(pointeur, camera);
    const touche = rayon.intersectObjects([...blocs.values()], false)[0];
    if (touche) o.surChoix(touche.object.userData.id as IdNoeud);
  };
  rendu.domElement.addEventListener("pointerdown", surBas);
  rendu.domElement.addEventListener("pointerup", surHaut);
  // Contexte perdu (pilote, mise en veille, trop de contextes ouverts) : le canevas se figerait.
  const surPerteContexte = () => o.surPerte();
  rendu.domElement.addEventListener("webglcontextlost", surPerteContexte);

  const redimensionner = () => {
    camera.aspect = largeur() / hauteur();
    camera.updateProjectionMatrix();
    // Cadre plus étroit (rotation du téléphone) : recul dans la même proportion, zoom de l'utilisateur gardé.
    const nouvelle = distanceCamera(o.noeuds, camera.aspect);
    camera.position.multiplyScalar(nouvelle / distance);
    distance = nouvelle;
    controles.maxDistance = Math.max(24, distance * 1.4);
    rendu.setSize(largeur(), hauteur());
    etiquettes.setSize(largeur(), hauteur());
  };
  const observateurTaille = new ResizeObserver(redimensionner);
  observateurTaille.observe(conteneur);

  let precedent = performance.now();
  const image = (t: number) => {
    const dt = Math.min(0.1, (t - precedent) / 1_000);
    precedent = t;
    const latences = o.latences();
    for (const p of paquets) {
      p.phase = (p.phase + dt / periodePaquet(p.serie ? latences[p.serie] : null)) % 1;
      p.mesh.position.lerpVectors(p.de, p.vers, p.phase);
    }
    controles.update(dt);
    rendu.render(scene, camera);
    etiquettes.render(scene, camera);
  };

  let ongletVisible = document.visibilityState === "visible";
  let aLEcran = true;
  const boucle = () => {
    precedent = performance.now();
    rendu.setAnimationLoop(ongletVisible && aLEcran ? image : null);
  };
  const surVisibilite = () => {
    ongletVisible = document.visibilityState === "visible";
    boucle();
  };
  document.addEventListener("visibilitychange", surVisibilite);
  const observateurEcran = new IntersectionObserver(([e]) => {
    aLEcran = e?.isIntersecting ?? true;
    boucle();
  });
  observateurEcran.observe(conteneur);
  boucle();

  return {
    marqueur: MARQUEUR_3D,
    choisir,
    arreter() {
      rendu.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", surVisibilite);
      observateurEcran.disconnect();
      observateurTaille.disconnect();
      rendu.domElement.removeEventListener("pointerdown", surBas);
      rendu.domElement.removeEventListener("pointerup", surHaut);
      rendu.domElement.removeEventListener("webglcontextlost", surPerteContexte);
      controles.dispose();
      geometrieBloc.dispose();
      geometriePaquet.dispose();
      materielPaquet.dispose();
      materielLigne.dispose();
      for (const g of lignes) g.dispose();
      for (const b of blocs.values()) b.material.dispose();
      // `dispose()` ne rend pas le contexte : sans cela, chaque aller-retour 2D/3D en laisserait un
      // ouvert, jusqu'à la limite du navigateur. L'écouteur de perte est déjà retiré.
      rendu.forceContextLoss();
      rendu.dispose();
      rendu.domElement.remove();
      etiquettes.domElement.remove();
    },
  };
}
