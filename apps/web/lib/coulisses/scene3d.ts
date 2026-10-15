/**
 * Vue 3D des coulisses (spec docs/superpowers/specs/2026-10-15-coulisses-3d-design.md) : ce module et
 * Three.js forment des morceaux à part (verifier-taille-3d), jamais chargés sans geste du visiteur.
 *
 * Une maquette de nuit : chaque nœud est un objet dont la forme dit le rôle (formes3d), posé sur le plateau
 * de son lieu (VPS, GitHub) ou sur un socle (services externes, navigateur), coloré par lieu ; la scène se
 * fond dans la page par un brouillard. Deux dispositions, large et étroite (téléphone), comme le schéma 2D. Liaisons courbes, paquets lumineux au rythme des latences mesurées,
 * étiquettes HTML nettes (CSS2DRenderer). Orbite à la souris ou au doigt, zoom borné, balancement lent.
 *
 * Sobriété : rendu en pause onglet caché ou scène hors de l'écran, 30 images par seconde au plus sur
 * pointeur grossier, densité de pixels plafonnée ; au processeur, résolution réduite. Tout est libéré par
 * `arreter()`, contexte WebGL compris.
 */
import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Fog,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import type { IdNoeud, Liaison, Noeud } from "@/data/architecture";
import { COULEURS_3D as C } from "./couleurs3d";
import { creerAtelier, type Objet } from "./formes3d";
import {
  ANGLE_CAMERA,
  BALANCEMENT,
  CHAMP_VERTICAL,
  HAUTEUR_ETIQUETTE,
  cadrage,
  centre,
  periodePaquet,
  plateaux,
  positionSol,
  socles,
  type Disposition,
} from "./geometrie3d";
import type { Serie } from "./magasin";

/** Repère ce morceau de JS dans le build (scripts/verifier-taille-3d.mjs). */
export const MARQUEUR_3D = "scene-3d:v1";

export type OptionsScene = {
  conteneur: HTMLElement;
  noeuds: readonly Noeud[];
  liaisons: readonly Liaison[];
  /** Disposition du cadre, comme le schéma 2D : la scène est recréée quand elle change. */
  disposition: Disposition;
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

/** Hauteur des liaisons au départ et à l'arrivée ; épaisseur des plateaux et des socles. */
const HAUTEUR_LIAISON = 0.5;
const EPAISSEUR_PLATEAU = 0.14;
const EPAISSEUR_SOCLE = 0.12;
/** Soulèvement d'un objet survolé ; période du balancement, en secondes ; calme après un geste, en ms. */
const SOULEVEMENT = 0.16;
const PERIODE_BALANCEMENT = 24;
const CALME_APRES_GESTE = 3_000;
/** Longueur de la traînée d'un paquet : nombre de halos, et écart entre deux, en fraction du trajet. */
const TRAINEE = 7;
const PAS_TRAINEE = 0.022;

type Paquet = { tete: Mesh; trainee: Sprite[]; courbe: QuadraticBezierCurve3; serie?: Serie; phase: number };
type ObjetPose = Objet & { id: IdNoeud; couleur: string; sol: number; halo: Sprite; etiquette: HTMLElement };

/** Lève une erreur si WebGL est indisponible ou si la construction échoue : l'appelant revient en 2D. */
export function creerScene(o: OptionsScene): Scene3D {
  const rendu = new WebGLRenderer({ antialias: true });
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

/** Dégradé radial blanc → transparent, pour les halos (teintés par leur matériau) et les ombres au sol. */
function textureHalo(): CanvasTexture {
  const toile = document.createElement("canvas");
  toile.width = toile.height = 64;
  const ctx = toile.getContext("2d")!;
  const degrade = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  degrade.addColorStop(0, "rgba(255,255,255,1)");
  degrade.addColorStop(0.35, "rgba(255,255,255,0.45)");
  degrade.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(toile);
}

function construire(o: OptionsScene, rendu: WebGLRenderer): Scene3D {
  const { conteneur, disposition: d } = o;
  const largeur = () => Math.max(1, conteneur.clientWidth);
  const hauteur = () => Math.max(1, conteneur.clientHeight);
  const aJeter: { dispose(): void }[] = [];
  const garder = <T extends { dispose(): void }>(x: T) => (aJeter.push(x), x);

  // Au processeur (SwiftShader, llvmpipe…), une pleine résolution ralentirait toute la page.
  const logiciel = renduLogiciel(rendu.getContext() as WebGL2RenderingContext);
  rendu.setPixelRatio(logiciel ? 1 : Math.min(window.devicePixelRatio, 2));
  rendu.setSize(largeur(), hauteur());
  conteneur.appendChild(rendu.domElement);

  const etiquettes = new CSS2DRenderer();
  etiquettes.setSize(largeur(), hauteur());
  Object.assign(etiquettes.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  conteneur.appendChild(etiquettes.domElement);

  // Ambiance : la nuit de la page, un brouillard qui y fond la scène au loin.
  const scene = new Scene();
  scene.background = new Color(C.fond);
  const brouillard = new Fog(C.fond, 10, 40);
  scene.fog = brouillard;
  scene.add(new AmbientLight(C.lieux["chez-vous"], 0.85));
  const soleil = new DirectionalLight(C.lieux["chez-vous"], 1.15);
  soleil.position.set(5, 9, 6);
  const contreJour = new DirectionalLight(C.lieux.externe, 0.5);
  contreJour.position.set(-6, 4, -6);
  scene.add(soleil, contreJour);

  const camera = new PerspectiveCamera(CHAMP_VERTICAL, largeur() / hauteur(), 0.1, 200);
  const controles = new OrbitControls(camera, rendu.domElement);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minPolarAngle = 0.35;
  controles.maxPolarAngle = 1.25;

  // Le monde se balance autour du centre de la scène : le pivot y est posé, le monde décalé d'autant.
  const milieu = centre(o.noeuds, d);
  const pivot = new Group();
  pivot.position.set(milieu.x, 0, milieu.z);
  const monde = new Group();
  monde.position.set(-milieu.x, 0, -milieu.z);
  pivot.add(monde);
  scene.add(pivot);
  const halo = garder(textureHalo());
  const nouveauHalo = (couleur: string, taille: number, opacite: number) => {
    const s = new Sprite(
      garder(new SpriteMaterial({ map: halo, color: couleur, transparent: true, opacity: opacite, blending: AdditiveBlending, depthWrite: false })),
    );
    s.scale.set(taille, taille, 1);
    return s;
  };
  const geometrieOmbre = garder(new PlaneGeometry(1.9, 1.9));
  const materiauOmbre = garder(new MeshBasicMaterial({ map: halo, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));

  const grille = new GridHelper(48, 96, C.grille, C.grille);
  grille.position.set(milieu.x, 0, milieu.z);
  const materiauGrille = grille.material as LineBasicMaterial;
  materiauGrille.transparent = true;
  materiauGrille.opacity = 0.6;
  garder(grille.geometry);
  garder(materiauGrille);
  monde.add(grille);

  /** Nom d'un plateau ou d'un socle, en petites capitales de la couleur de son lieu. */
  const nomDeLieu = (texte: string, couleur: string, ancre: [number, number]) => {
    const el = document.createElement("span");
    el.textContent = texte;
    el.className = "text-[11px] font-medium uppercase tracking-[0.14em]";
    el.style.color = couleur;
    const objet = new CSS2DObject(el);
    objet.center.set(...ancre);
    return objet;
  };

  for (const p of plateaux(o.noeuds, d)) {
    const couleur = C.lieux[p.lieu];
    const geometrie = garder(new BoxGeometry(p.largeur, EPAISSEUR_PLATEAU, p.profondeur));
    const dalle = new Mesh(geometrie, garder(new MeshStandardMaterial({ color: C.surface, roughness: 0.9 })));
    dalle.position.set(p.x, EPAISSEUR_PLATEAU / 2, p.z);
    const lisere = new LineSegments(garder(new EdgesGeometry(geometrie)), garder(new LineBasicMaterial({ color: couleur, transparent: true, opacity: 0.45 })));
    lisere.position.copy(dalle.position);
    // Sous le bord avant, à gauche ; si un autre plateau le cache par devant, au-dessus de son bord arrière,
    // plus haut que les étiquettes de ses nœuds, comme un titre.
    const nom = nomDeLieu(p.nom, couleur, p.nomDerriere ? [0.5, 1] : [0, -0.4]);
    if (p.nomDerriere) nom.position.set(p.x, HAUTEUR_ETIQUETTE + 0.5, p.z - p.profondeur / 2);
    else nom.position.set(p.x - p.largeur / 2 + 0.2, EPAISSEUR_PLATEAU, p.z + p.profondeur / 2);
    monde.add(dalle, lisere, nom);
  }
  for (const s of socles(o.noeuds, d)) {
    const couleur = C.lieux[s.lieu];
    const disque = new Mesh(garder(new CylinderGeometry(s.rayon, s.rayon, EPAISSEUR_SOCLE, 48)), garder(new MeshStandardMaterial({ color: C.surface, roughness: 0.9 })));
    disque.position.set(s.x, EPAISSEUR_SOCLE / 2, s.z);
    const anneau = new Mesh(garder(new TorusGeometry(s.rayon, 0.014, 6, 64)), garder(new MeshBasicMaterial({ color: couleur, transparent: true, opacity: 0.5 })));
    anneau.rotation.x = Math.PI / 2;
    anneau.position.set(s.x, EPAISSEUR_SOCLE + 0.005, s.z);
    monde.add(disque, anneau);
    if (s.nom) {
      const nom = nomDeLieu(s.nom, couleur, [0.5, -0.3]);
      nom.position.set(s.x, EPAISSEUR_SOCLE, s.z + s.rayon);
      monde.add(nom);
    }
  }

  // Les objets, chacun sur son support.
  const atelier = creerAtelier();
  const surPlateau = new Set(plateaux(o.noeuds, d).map((p) => p.lieu));
  const objets = new Map<IdNoeud, ObjetPose>();
  for (const n of o.noeuds) {
    const couleur = C.lieux[n.lieu];
    const objet = atelier.objet(n.id, couleur);
    garder(objet.materiau);
    const sol = surPlateau.has(n.lieu) ? EPAISSEUR_PLATEAU : EPAISSEUR_SOCLE;
    const { x, z } = positionSol(n.id, d);
    objet.groupe.position.set(x, sol, z);
    const ombre = new Mesh(geometrieOmbre, materiauOmbre);
    ombre.rotation.x = -Math.PI / 2;
    ombre.position.y = 0.012;
    const lueur = nouveauHalo(C.actif, 2.6, 0);
    lueur.position.y = 0.35;
    const etiquette = document.createElement("span");
    etiquette.textContent = n.nom;
    const nom = new CSS2DObject(etiquette);
    nom.center.set(0.5, 1);
    nom.position.y = HAUTEUR_ETIQUETTE - sol;
    objet.groupe.add(ombre, lueur, nom);
    monde.add(objet.groupe);
    objets.set(n.id, { ...objet, id: n.id, couleur, sol, halo: lueur, etiquette });
  }

  // Liaisons courbes et paquets.
  const paquets: Paquet[] = [];
  const geometrieTete = garder(new SphereGeometry(0.07, 14, 14));
  const materiauTete = garder(new MeshBasicMaterial({ color: C.lieux["chez-vous"] }));
  const materiauLiaison = garder(new MeshBasicMaterial({ color: C.liaison, transparent: true, opacity: 0.85 }));
  for (const l of o.liaisons) {
    const de = positionSol(l.de, d);
    const vers = positionSol(l.vers, d);
    const a = new Vector3(de.x, HAUTEUR_LIAISON, de.z);
    const b = new Vector3(vers.x, HAUTEUR_LIAISON, vers.z);
    const sommet = a.clone().lerp(b, 0.5);
    sommet.y += 0.3 + a.distanceTo(b) * 0.12;
    const courbe = new QuadraticBezierCurve3(a, sommet, b);
    monde.add(new Mesh(garder(new TubeGeometry(courbe, 48, 0.03, 8)), materiauLiaison));
    if (o.mouvementReduit) continue;
    const tete = new Mesh(geometrieTete, materiauTete);
    tete.add(nouveauHalo(C.actif, 0.8, 0.75));
    const trainee = Array.from({ length: TRAINEE }, (_, k) => nouveauHalo(C.actif, 0.32 * (1 - (k + 1) / 9), 0.45 * (1 - (k + 1) / 8)));
    monde.add(tete, ...trainee);
    paquets.push({ tete, trainee, courbe, serie: l.mesure, phase: Math.random() });
  }

  let choisi = o.choisi;
  const peindre = () => {
    for (const ob of objets.values()) {
      const actif = ob.id === choisi;
      ob.materiau.color.set(actif ? C.actif : ob.couleur);
      ob.materiau.emissive.set(actif ? C.actif : 0x000000);
      ob.materiau.emissiveIntensity = actif ? 0.15 : 0;
      (ob.halo.material as SpriteMaterial).opacity = actif ? 0.35 : 0;
      ob.etiquette.className = actif
        ? "rounded border border-accent bg-accent px-1.5 py-0.5 text-xs font-semibold text-sur-accent"
        : "rounded border border-trait-fort bg-surface px-1.5 py-0.5 text-xs font-semibold text-texte";
    }
  };
  peindre();

  // Cadrage : la caméra recule pour tout voir. Au redimensionnement, le zoom de l'utilisateur est gardé en
  // proportion.
  let distance = 0;
  const cadrer = () => {
    const aspect = largeur() / hauteur();
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const { cible, distance: nouvelle } = cadrage(o.noeuds, d, aspect);
    const recul = distance ? camera.position.distanceTo(controles.target) / distance : 1;
    const direction = distance
      ? camera.position.clone().sub(controles.target).normalize()
      : new Vector3(0, Math.cos(ANGLE_CAMERA[d]), Math.sin(ANGLE_CAMERA[d]));
    distance = nouvelle;
    controles.target.set(cible.x, cible.y, cible.z);
    camera.position.copy(controles.target).addScaledVector(direction, distance * recul);
    controles.minDistance = distance * 0.55;
    controles.maxDistance = distance * 1.5;
    brouillard.near = distance * 0.9;
    brouillard.far = distance * 2.3;
    rendu.setSize(largeur(), hauteur());
    etiquettes.setSize(largeur(), hauteur());
  };
  cadrer();
  const observateurTaille = new ResizeObserver(cadrer);
  observateurTaille.observe(conteneur);

  // Survol (pointeur fin seulement) et clic sans glisser : le glisser fait tourner la scène.
  const fin = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const grossier = window.matchMedia("(pointer: coarse)").matches;
  const pieces = [...objets.values()].flatMap((ob) => ob.pieces);
  const rayon = new Raycaster();
  const pointeur = new Vector2();
  const viser = (x: number, y: number): IdNoeud | null => {
    const r = rendu.domElement.getBoundingClientRect();
    pointeur.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(pointeur, camera);
    return (rayon.intersectObjects(pieces, false)[0]?.object.userData.id as IdNoeud | undefined) ?? null;
  };
  let survol: IdNoeud | null = null;
  let viseeEnAttente: { x: number; y: number } | null = null;
  let depart: { x: number; y: number } | null = null;
  let dernierGeste = -Infinity;
  const surBas = (e: PointerEvent) => {
    depart = { x: e.clientX, y: e.clientY };
    dernierGeste = performance.now();
  };
  const surHaut = (e: PointerEvent) => {
    if (!depart || Math.hypot(e.clientX - depart.x, e.clientY - depart.y) > 5) return;
    const id = viser(e.clientX, e.clientY);
    if (id) o.surChoix(id);
  };
  const surMouvement = (e: PointerEvent) => {
    if (fin) viseeEnAttente = { x: e.clientX, y: e.clientY };
  };
  const surSortie = () => {
    viseeEnAttente = null;
    survol = null;
    rendu.domElement.style.cursor = "";
  };
  const surGeste = () => {
    dernierGeste = performance.now();
  };
  rendu.domElement.addEventListener("pointerdown", surBas);
  rendu.domElement.addEventListener("pointerup", surHaut);
  rendu.domElement.addEventListener("pointermove", surMouvement);
  rendu.domElement.addEventListener("pointerleave", surSortie);
  controles.addEventListener("change", surGeste);
  // Contexte perdu (pilote, mise en veille, trop de contextes ouverts) : le canevas se figerait.
  const surPerteContexte = () => o.surPerte();
  rendu.domElement.addEventListener("webglcontextlost", surPerteContexte);

  let precedent = performance.now();
  let tempsBalancement = 0;
  let impaire = false;
  const image = (t: number) => {
    // Pointeur grossier (téléphone, tablette) : une image sur deux, pour la batterie.
    if (grossier && (impaire = !impaire)) return;
    const dt = Math.min(0.1, (t - precedent) / 1_000);
    precedent = t;

    if (viseeEnAttente) {
      survol = viser(viseeEnAttente.x, viseeEnAttente.y);
      viseeEnAttente = null;
      rendu.domElement.style.cursor = survol ? "pointer" : "";
    }
    for (const ob of objets.values()) {
      const cible = ob.sol + (ob.id === survol ? SOULEVEMENT : 0);
      ob.groupe.position.y += (cible - ob.groupe.position.y) * Math.min(1, dt * 12);
    }

    // Balancement lent, suspendu pendant et juste après un geste ; aucun en mouvement réduit.
    if (!o.mouvementReduit && t - dernierGeste > CALME_APRES_GESTE) tempsBalancement += dt;
    pivot.rotation.y = o.mouvementReduit ? 0 : BALANCEMENT[d] * Math.sin((2 * Math.PI * tempsBalancement) / PERIODE_BALANCEMENT);

    const latences = o.latences();
    for (const p of paquets) {
      p.phase = (p.phase + dt / periodePaquet(p.serie ? latences[p.serie] : null)) % 1;
      p.courbe.getPoint(p.phase, p.tete.position);
      p.trainee.forEach((s, k) => {
        const u = p.phase - (k + 1) * PAS_TRAINEE;
        s.visible = u > 0;
        if (u > 0) p.courbe.getPoint(u, s.position);
      });
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
    choisir(id) {
      choisi = id;
      peindre();
    },
    arreter() {
      rendu.setAnimationLoop(null);
      document.removeEventListener("visibilitychange", surVisibilite);
      observateurEcran.disconnect();
      observateurTaille.disconnect();
      rendu.domElement.removeEventListener("pointerdown", surBas);
      rendu.domElement.removeEventListener("pointerup", surHaut);
      rendu.domElement.removeEventListener("pointermove", surMouvement);
      rendu.domElement.removeEventListener("pointerleave", surSortie);
      rendu.domElement.removeEventListener("webglcontextlost", surPerteContexte);
      controles.removeEventListener("change", surGeste);
      controles.dispose();
      atelier.liberer();
      for (const x of aJeter) x.dispose();
      // `dispose()` ne rend pas le contexte : sans cela, chaque aller-retour 2D/3D en laisserait un
      // ouvert, jusqu'à la limite du navigateur. L'écouteur de perte est déjà retiré.
      rendu.forceContextLoss();
      rendu.dispose();
      rendu.domElement.remove();
      etiquettes.domElement.remove();
    },
  };
}
