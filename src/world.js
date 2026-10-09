// ============================================================
//  LE MONDE : le ciel, la mer, l'île, la piste, le village
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

// L'île : un grand plateau plat entouré de plages
export const ILE = { x: 0, z: -400, rayon: 350, hauteurPlateau: 8 };
// La montagne, dans un coin de l'île
export const MONTAGNE = { x: 190, z: -580, rayon: 130, hauteur: 90 };
// La piste d'atterrissage (tout droit, dans l'axe nord-sud)
export const PISTE = { x: 0, z: -400, longueur: 360, largeur: 24 };
// Le village (un cercle où on pose les maisons)
export const VILLAGE = { x: -160, z: -380, rayon: 85 };
// La tour de contrôle, à côté de la piste
export const TOUR = { x: 45, z: -330 };

// Les obstacles (maisons, tour) : l'avion rebondit dessus au lieu de passer à travers
const OBSTACLES = [];

// Un "hasard" qui donne toujours les mêmes nombres :
// le village et les arbres sont au même endroit à chaque partie.
function creerHasard(graine) {
  return function () {
    graine = (graine + 0x6d2b79f5) | 0;
    let t = Math.imul(graine ^ (graine >>> 15), 1 | graine);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance entre un point et la piste (0 = on est sur la piste)
export function distanceALaPiste(x, z) {
  const dx = Math.max(Math.abs(x - PISTE.x) - PISTE.largeur / 2, 0);
  const dz = Math.max(Math.abs(z - PISTE.z) - PISTE.longueur / 2, 0);
  return Math.hypot(dx, dz);
}

export function surLaPiste(x, z) {
  return distanceALaPiste(x, z) === 0;
}

// Donne la hauteur du sol à un endroit (x, z). 0 = niveau de la mer.
// Sert à dessiner l'île ET à faire rouler / rebondir l'avion.
export function hauteurDuSol(x, z) {
  const transition = THREE.MathUtils.smoothstep;

  // 1) Le plateau : 1 au milieu de l'île, 0 dans la mer
  const d = Math.hypot(x - ILE.x, z - ILE.z) / ILE.rayon;
  const plateau = 1 - transition(d, 0.75, 1);
  let h = (ILE.hauteurPlateau + 4) * plateau - 4; // -4 = le fond de la mer
  h += Math.sin(x * 0.04) * Math.cos(z * 0.05) * 2 * plateau; // petites collines

  // 2) La montagne
  const dm = Math.hypot(x - MONTAGNE.x, z - MONTAGNE.z) / MONTAGNE.rayon;
  if (dm < 1) {
    const c = Math.cos(dm * Math.PI / 2);
    h += c * c * MONTAGNE.hauteur + Math.sin(x * 0.15) * Math.cos(z * 0.13) * 4 * c;
  }

  // 3) On aplatit le terrain autour de la piste et du village
  const plat = Math.max(
    1 - transition(distanceALaPiste(x, z), 0, 30),
    1 - transition(Math.max(Math.hypot(x - VILLAGE.x, z - VILLAGE.z) - VILLAGE.rayon, 0), 0, 30)
  );
  return h + (ILE.hauteurPlateau - h) * plat;
}

// Hauteur du plus haut obstacle (maison, tour) à cet endroit, ou 0 s'il n'y en a pas
export function hauteurDesObstacles(x, z) {
  let sommet = 0;
  for (const o of OBSTACLES) {
    if (Math.hypot(x - o.x, z - o.z) < o.rayon) sommet = Math.max(sommet, o.sommet);
  }
  return sommet;
}

// Petit raccourci pour fabriquer une matière "low-poly"
function matiere(couleur, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, flatShading: true, ...extra });
}

// Choisit la couleur du sol selon la hauteur
function couleurSelonHauteur(h) {
  if (h < 2.5) return new THREE.Color(CONFIG.couleurSable);
  if (h < 30) return new THREE.Color(CONFIG.couleurHerbe);
  if (h < 65) return new THREE.Color(CONFIG.couleurRoche);
  return new THREE.Color(CONFIG.couleurNeige);
}

// ---------- L'île ----------
function creerIle() {
  const taille = ILE.rayon * 2.2;
  const geo = new THREE.PlaneGeometry(taille, taille, 96, 96);
  geo.rotateX(-Math.PI / 2); // on couche le carré à plat

  const positions = geo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i) + ILE.x;
    const z = positions.getZ(i) + ILE.z;
    positions.setY(i, hauteurDuSol(x, z));
  }

  // "Flat shading" : chaque triangle a une seule couleur (style low-poly)
  const geoLowPoly = geo.toNonIndexed();
  const pos = geoLowPoly.attributes.position;
  const hasard = creerHasard(7);
  const couleurs = [];
  for (let i = 0; i < pos.count; i += 3) {
    const hMoyenne = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const c = couleurSelonHauteur(hMoyenne);
    c.offsetHSL(0, 0, (hasard() - 0.5) * 0.05); // nuances pour que ce soit plus vivant
    for (let k = 0; k < 3; k++) couleurs.push(c.r, c.g, c.b);
  }
  geoLowPoly.setAttribute('color', new THREE.Float32BufferAttribute(couleurs, 3));
  geoLowPoly.computeVertexNormals();

  const mesh = new THREE.Mesh(geoLowPoly, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }));
  mesh.position.set(ILE.x, 0, ILE.z);
  return mesh;
}

// ---------- La piste d'atterrissage ----------
function creerPiste() {
  const groupe = new THREE.Group();
  const y = ILE.hauteurPlateau;
  const blanc = matiere(0xffffff);

  // Le goudron
  const goudron = new THREE.Mesh(new THREE.BoxGeometry(PISTE.largeur, 0.2, PISTE.longueur), matiere(CONFIG.couleurPiste));
  goudron.position.y = y - 0.05;
  groupe.add(goudron);

  // Les pointillés blancs au milieu
  for (let z = -PISTE.longueur / 2 + 45; z < PISTE.longueur / 2 - 40; z += 30) {
    const trait = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 14), blanc);
    trait.position.set(0, y + 0.08, z);
    groupe.add(trait);
  }

  // Les bandes blanches au début et à la fin de la piste
  for (const bout of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      for (const cote of [-1, 1]) {
        const bande = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 18), blanc);
        bande.position.set(cote * (2.5 + i * 3.2), y + 0.08, bout * (PISTE.longueur / 2 - 14));
        groupe.add(bande);
      }
    }
  }

  // Les petites lumières jaunes sur les bords
  const lumiere = matiere(0xffd400, { emissive: 0xffaa00, emissiveIntensity: 0.6 });
  for (let z = -PISTE.longueur / 2; z <= PISTE.longueur / 2; z += 30) {
    for (const cote of [-1, 1]) {
      const lampe = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), lumiere);
      lampe.position.set(cote * (PISTE.largeur / 2 + 1.5), y + 0.35, z);
      groupe.add(lampe);
    }
  }

  groupe.position.set(PISTE.x, 0, PISTE.z);
  return groupe;
}

// ---------- La tour de contrôle ----------
function creerTour() {
  const groupe = new THREE.Group();
  const pied = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3, 18, 8), matiere(0xf2f2f2));
  pied.position.y = 9;
  const cabine = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 3.5, 8),
    matiere(0x7cc7ff, { metalness: 0.3, roughness: 0.2 }));
  cabine.position.y = 19.75;
  const toit = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2, 8), matiere(0xd9534f));
  toit.position.y = 22.5;
  groupe.add(pied, cabine, toit);

  const sol = hauteurDuSol(TOUR.x, TOUR.z);
  groupe.position.set(TOUR.x, sol, TOUR.z);
  OBSTACLES.push({ x: TOUR.x, z: TOUR.z, rayon: 5, sommet: sol + 23.5 });
  return groupe;
}

// ---------- La manche à air (montre d'où vient le vent) ----------
function creerMancheAAir(x, z) {
  const groupe = new THREE.Group();
  const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 6), matiere(0xdddddd));
  mat.position.y = 3.5;
  const manche = new THREE.Mesh(new THREE.ConeGeometry(0.8, 4, 8, 1, true), matiere(0xff7a00, { side: THREE.DoubleSide }));
  manche.rotation.z = Math.PI / 2;
  manche.position.set(2, 6.6, 0);
  groupe.add(mat, manche);
  groupe.position.set(x, hauteurDuSol(x, z), z);
  return groupe;
}

// ---------- Une maison ----------
function creerMaison(hasard) {
  const groupe = new THREE.Group();
  const largeur = 9 + hasard() * 5;
  const profondeur = 7 + hasard() * 4;
  const hauteurMur = 5 + hasard() * 2.5;
  const hauteurToit = 3.5 + hasard() * 1.5;
  const couleurMur = CONFIG.couleursMurs[Math.floor(hasard() * CONFIG.couleursMurs.length)];
  const couleurToit = CONFIG.couleursToits[Math.floor(hasard() * CONFIG.couleursToits.length)];

  // Les murs
  const murs = new THREE.Mesh(new THREE.BoxGeometry(largeur, hauteurMur, profondeur), matiere(couleurMur));
  murs.position.y = hauteurMur / 2;
  groupe.add(murs);

  // Le toit : une pyramide à 4 côtés
  const geoToit = new THREE.ConeGeometry(1, 1, 4);
  geoToit.rotateY(Math.PI / 4);
  const toit = new THREE.Mesh(geoToit, matiere(couleurToit));
  toit.scale.set(largeur * 0.78, hauteurToit, profondeur * 0.78);
  toit.position.y = hauteurMur + hauteurToit / 2;
  groupe.add(toit);

  // La porte et deux fenêtres
  const porte = new THREE.Mesh(new THREE.BoxGeometry(1.8, 3, 0.2), matiere(0x6b4226));
  porte.position.set(0, 1.5, profondeur / 2 + 0.05);
  groupe.add(porte);
  for (const cote of [-1, 1]) {
    const fenetre = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 0.2), matiere(0x9fd8ff));
    fenetre.position.set(cote * largeur * 0.3, hauteurMur * 0.6, profondeur / 2 + 0.05);
    groupe.add(fenetre);
  }

  groupe.userData.rayon = Math.max(largeur, profondeur) / 2 + 1;
  groupe.userData.hauteur = hauteurMur + hauteurToit;
  return groupe;
}

function creerVillage(scene) {
  const hasard = creerHasard(42);
  const placees = [];
  let essais = 0;
  while (placees.length < CONFIG.nombreMaisons && essais < 1000) {
    essais++;
    // Un point au hasard dans le cercle du village
    const angle = hasard() * Math.PI * 2;
    const r = Math.sqrt(hasard()) * VILLAGE.rayon;
    const x = VILLAGE.x + Math.cos(angle) * r;
    const z = VILLAGE.z + Math.sin(angle) * r;
    // Pas trop près d'une autre maison
    if (placees.some((m) => Math.hypot(m.x - x, m.z - z) < 24)) continue;
    placees.push({ x, z });

    const maison = creerMaison(hasard);
    const sol = hauteurDuSol(x, z);
    maison.position.set(x, sol, z);
    maison.rotation.y = Math.floor(hasard() * 4) * Math.PI / 2 + (hasard() - 0.5) * 0.3;
    scene.add(maison);
    OBSTACLES.push({ x, z, rayon: maison.userData.rayon, sommet: sol + maison.userData.hauteur });
  }
}

// ---------- Les arbres ----------
function creerArbres(scene) {
  const hasard = creerHasard(123);
  const geoTronc = new THREE.CylinderGeometry(0.4, 0.6, 3, 6);
  const geoFeuilles = new THREE.ConeGeometry(2.8, 7, 7);
  const matTronc = matiere(0x7a4b2a);
  const matFeuilles = [matiere(0x2f9e44), matiere(0x3fb950), matiere(0x24813a)];

  let plantes = 0;
  for (let essai = 0; essai < CONFIG.nombreArbres * 20 && plantes < CONFIG.nombreArbres; essai++) {
    const angle = hasard() * Math.PI * 2;
    const r = Math.sqrt(hasard()) * ILE.rayon * 0.85;
    const x = ILE.x + Math.cos(angle) * r;
    const z = ILE.z + Math.sin(angle) * r;
    const h = hauteurDuSol(x, z);
    // Pas dans l'eau, pas trop haut sur la montagne, pas sur la piste, pas dans le village
    if (h < 3 || h > 35) continue;
    if (distanceALaPiste(x, z) < 25) continue;
    if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.rayon + 8) continue;
    if (Math.hypot(x - TOUR.x, z - TOUR.z) < 12) continue;

    const arbre = new THREE.Group();
    const tronc = new THREE.Mesh(geoTronc, matTronc);
    tronc.position.y = 1.5;
    const feuilles = new THREE.Mesh(geoFeuilles, matFeuilles[plantes % 3]);
    feuilles.position.y = 6.5;
    arbre.add(tronc, feuilles);
    arbre.scale.setScalar(0.8 + hasard() * 0.6);
    arbre.position.set(x, h, z);
    scene.add(arbre);
    plantes++;
  }
}

export function creerMonde(scene) {
  // Le ciel et un peu de brume au loin
  scene.background = new THREE.Color(CONFIG.couleurCiel);
  scene.fog = new THREE.Fog(CONFIG.couleurCiel, 450, 1500);

  // Les lumières : le soleil + une lumière douce venant du ciel
  const soleil = new THREE.DirectionalLight(0xffffff, 2.2);
  soleil.position.set(200, 400, 100);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x3d6b3d, 1.0));

  // La mer : un grand carré bleu
  const mer = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.tailleMonde, CONFIG.tailleMonde),
    matiere(CONFIG.couleurMer)
  );
  mer.rotation.x = -Math.PI / 2;
  scene.add(mer);

  scene.add(creerIle());
  scene.add(creerPiste());
  scene.add(creerTour());
  scene.add(creerMancheAAir(-25, PISTE.z + PISTE.longueur / 2 - 30));
  creerVillage(scene);
  creerArbres(scene);
}
