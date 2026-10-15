/**
 * Formes des nœuds dans la scène 3D : un objet dont la silhouette dit le rôle
 * (écran, disques de base de données, fusée du déploiement…). Géométries simples
 * du cœur de Three.js, partagées entre les objets et libérées par `liberer()`.
 * Chargé avec scene3d, dans le morceau de la vue 3D.
 */
import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  TorusGeometry,
  type BufferGeometry,
} from "three";
import type { IdNoeud } from "@/data/architecture";

/** Une pièce de l'objet : sa géométrie, sa place (x, y, z) et son inclinaison autour de x. */
type Piece = [geometrie: BufferGeometry, x: number, y: number, z: number, inclinaison?: number];

export type Objet = { groupe: Group; materiau: MeshStandardMaterial; pieces: Mesh[] };

export type Atelier = { objet(id: IdNoeud, couleur: string): Objet; liberer(): void };

export function creerAtelier(): Atelier {
  const geometries: BufferGeometry[] = [];
  const garder = <G extends BufferGeometry>(g: G) => (geometries.push(g), g);
  const lame = garder(new BoxGeometry(1.4, 0.16, 0.8));
  const disque = garder(new CylinderGeometry(0.5, 0.5, 0.24, 40));
  const conteneur = garder(new BoxGeometry(1.2, 0.22, 0.6));
  const barre = [0.4, 0.75, 1.1].map((h) => garder(new BoxGeometry(0.28, h, 0.28)));

  const pieces: Record<IdNoeud, Piece[]> = {
    // Écran sur pied.
    navigateur: [
      [garder(new BoxGeometry(1.3, 0.85, 0.08)), 0, 0.75, 0],
      [garder(new BoxGeometry(0.12, 0.3, 0.12)), 0, 0.17, 0],
      [garder(new BoxGeometry(0.6, 0.04, 0.4)), 0, 0.02, 0],
    ],
    // Trois lames empilées.
    proxy: [0, 1, 2].map((i): Piece => [lame, 0, 0.1 + i * 0.2, 0]),
    site: [[garder(new BoxGeometry(1.3, 0.8, 0.9)), 0, 0.4, 0]],
    // Trois disques empilés.
    base: [0, 1, 2].map((i): Piece => [disque, 0, 0.13 + i * 0.28, 0]),
    // Anneau debout.
    tempsReel: [[garder(new TorusGeometry(0.42, 0.11, 18, 56)), 0, 0.6, 0]],
    // Trois barres de hauteurs croissantes.
    statistiques: barre.map((g, i): Piece => [g, -0.38 + i * 0.38, [0.4, 0.75, 1.1][i]! / 2, 0]),
    // Enveloppe inclinée.
    mails: [[garder(new BoxGeometry(1.1, 0.7, 0.08)), 0, 0.45, 0, -0.25]],
    // Écrou : prisme à huit pans et son moyeu.
    integration: [
      [garder(new CylinderGeometry(0.55, 0.55, 0.28, 8)), 0, 0.14, 0],
      [garder(new CylinderGeometry(0.22, 0.22, 0.34, 24)), 0, 0.17, 0],
    ],
    // Trois conteneurs empilés.
    registre: [0, 1, 2].map((i): Piece => [conteneur, 0, 0.12 + i * 0.25, 0]),
    // Fusée.
    deploiement: [[garder(new ConeGeometry(0.38, 1, 32)), 0, 0.5, 0]],
  };

  return {
    objet(id, couleur) {
      const materiau = new MeshStandardMaterial({ color: couleur, roughness: 0.7, metalness: 0.05 });
      const groupe = new Group();
      const meshes = pieces[id].map(([geometrie, x, y, z, inclinaison = 0]) => {
        const mesh = new Mesh(geometrie, materiau);
        mesh.position.set(x, y, z);
        mesh.rotation.x = inclinaison;
        mesh.userData.id = id;
        groupe.add(mesh);
        return mesh;
      });
      return { groupe, materiau, pieces: meshes };
    },
    liberer() {
      for (const g of geometries) g.dispose();
    },
  };
}
