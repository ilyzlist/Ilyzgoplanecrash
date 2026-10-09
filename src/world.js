// ============================================================
//  LE MONDE : le ciel, la mer et les îles
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

// Liste des îles : position (x, z), rayon et hauteur du sommet.
// Pour l'instant il n'y en a qu'une (étape 1). On en ajoutera d'autres à l'étape 2.
export const ILES = [
  { x: 0, z: -300, rayon: 160, hauteur: 70 },
];

// Donne la hauteur du sol à un endroit (x, z).
// 0 = niveau de la mer. Sert à dessiner les îles ET à faire rebondir l'avion.
export function hauteurDuSol(x, z) {
  let h = 0;
  for (const ile of ILES) {
    const dx = x - ile.x;
    const dz = z - ile.z;
    const distance = Math.sqrt(dx * dx + dz * dz) / ile.rayon; // 0 au centre, 1 au bord
    if (distance < 1) {
      // Forme de colline arrondie
      const colline = Math.cos(distance * Math.PI / 2);
      // Petites bosses pour que ce ne soit pas trop lisse
      const bosses = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 6;
      h = Math.max(h, colline * colline * ile.hauteur + bosses * colline);
    }
  }
  return h;
}

// Choisit la couleur du sol selon la hauteur
function couleurSelonHauteur(h) {
  if (h < 4) return new THREE.Color(CONFIG.couleurSable);
  if (h < 40) return new THREE.Color(CONFIG.couleurHerbe);
  if (h < 60) return new THREE.Color(CONFIG.couleurRoche);
  return new THREE.Color(CONFIG.couleurNeige);
}

// Fabrique une île en déformant un carré plat
function creerIle(ile) {
  const taille = ile.rayon * 2.2;
  const geo = new THREE.PlaneGeometry(taille, taille, 48, 48);
  geo.rotateX(-Math.PI / 2); // on couche le carré à plat

  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + ile.x;
    const z = positions.getZ(i) + ile.z;
    // Un peu sous l'eau sur les bords pour que l'île "sorte" de la mer
    positions.setY(i, hauteurDuSol(x, z) - 2);
  }

  // "Flat shading" : chaque triangle a une seule couleur (style low-poly)
  const geoLowPoly = geo.toNonIndexed();
  const pos = geoLowPoly.attributes.position;
  const couleurs = [];
  for (let i = 0; i < pos.count; i += 3) {
    const hMoyenne = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 + 2;
    const c = couleurSelonHauteur(hMoyenne);
    for (let k = 0; k < 3; k++) couleurs.push(c.r, c.g, c.b);
  }
  geoLowPoly.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
  geoLowPoly.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true });
  const mesh = new THREE.Mesh(geoLowPoly, mat);
  mesh.position.set(ile.x, 0, ile.z);
  return mesh;
}

export function creerMonde(scene) {
  // Le ciel et un peu de brume au loin
  scene.background = new THREE.Color(CONFIG.couleurCiel);
  scene.fog = new THREE.Fog(CONFIG.couleurCiel, 400, 1400);

  // Les lumières : le soleil + une lumière douce venant du ciel
  const soleil = new THREE.DirectionalLight(0xffffff, 2.2);
  soleil.position.set(200, 400, 100);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x3d6b3d, 1.0));

  // La mer : un grand carré bleu
  const mer = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.tailleMonde, CONFIG.tailleMonde),
    new THREE.MeshStandardMaterial({ color: CONFIG.couleurMer, flatShading: true })
  );
  mer.rotation.x = -Math.PI / 2;
  scene.add(mer);

  // Les îles
  for (const ile of ILES) scene.add(creerIle(ile));
}
