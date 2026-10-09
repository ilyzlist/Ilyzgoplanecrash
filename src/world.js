// ============================================================
//  LE MONDE : le ciel, la mer, l'île, l'aérodrome, le village
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

// L'île : un grand plateau plat entouré de plages
export const ILE = { x: 0, z: -500, rayon: 450, hauteurPlateau: 8 };
// La montagne, au nord-ouest de l'île
export const MONTAGNE = { x: -220, z: -800, rayon: 160, hauteur: 110 };
// La piste d'atterrissage, dans l'axe nord-sud.
// On arrive par le sud (z grand) en volant vers le nord (vers -z) : c'est la piste "36".
export const PISTE = { x: 0, z: -500, longueur: 600, largeur: 40 };
// L'aéroport à côté de la piste : le parking des avions (aire de stationnement)
export const PARKING = { x0: 90, x1: 160, z0: -585, z1: -495 };
// Le village (un cercle où on pose les maisons)
export const VILLAGE = { x: -210, z: -450, rayon: 95 };
// La tour de contrôle, à côté du parking
export const TOUR = { x: 75, z: -470 };
// Le grand panneau de bienvenue, à gauche du début de la piste
const PANNEAU = { x: -80, z: -320 };

// Les zones où le terrain est tout plat
const ZONE_PISTE = {
  x0: PISTE.x - PISTE.largeur / 2, x1: PISTE.x + PISTE.largeur / 2,
  z0: PISTE.z - PISTE.longueur / 2, z1: PISTE.z + PISTE.longueur / 2,
};
const ZONE_AEROPORT = { x0: 20, x1: 175, z0: -645, z1: -455 };

// Le seuil de la piste 36 (là où elle commence quand on arrive du sud)
const SEUIL_SUD = PISTE.z + PISTE.longueur / 2;
// Les lumières PAPI sont à côté du point où l'on doit toucher la piste
const PAPI_Z = SEUIL_SUD - 140;

// Les obstacles (maisons, tour, hangar…) : l'avion rebondit dessus
const OBSTACLES = [];
export function ajouterObstacle(x, z, rayon, sommet) {
  OBSTACLES.push({ x, z, rayon, sommet });
}

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

// Distance entre un point et un rectangle (0 = on est dedans)
function distanceAuRectangle(x, z, r) {
  const dx = Math.max(r.x0 - x, 0, x - r.x1);
  const dz = Math.max(r.z0 - z, 0, z - r.z1);
  return Math.hypot(dx, dz);
}

export function distanceALaPiste(x, z) {
  return distanceAuRectangle(x, z, ZONE_PISTE);
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

  // 3) On aplatit le terrain autour de la piste, de l'aéroport et du village
  const plat = Math.max(
    1 - transition(distanceAuRectangle(x, z, ZONE_PISTE), 0, 30),
    1 - transition(distanceAuRectangle(x, z, ZONE_AEROPORT), 0, 30),
    1 - transition(Math.max(Math.hypot(x - VILLAGE.x, z - VILLAGE.z) - VILLAGE.rayon, 0), 0, 30)
  );
  return h + (ILE.hauteurPlateau - h) * plat;
}

// Hauteur du plus haut obstacle (maison, tour…) à cet endroit, ou 0 s'il n'y en a pas
export function hauteurDesObstacles(x, z) {
  let sommet = 0;
  for (const o of OBSTACLES) {
    if (Math.hypot(x - o.x, z - o.z) < o.rayon) sommet = Math.max(sommet, o.sommet);
  }
  return sommet;
}

// Les lumières PAPI : 4 lumières à gauche de la piste qui disent si on descend bien.
//   4 blanches = trop haut · 2 blanches + 2 rouges = parfait · 4 rouges = trop bas
// Renvoie un tableau de 4 vrai/faux (vrai = blanche), de la lumière la plus proche
// de la piste à la plus éloignée. Renvoie null si l'avion n'est pas en approche.
export function lumieresPAPI(x, yRoues, z) {
  const distance = z - PAPI_Z;
  if (distance < 20 || distance > 1500 || Math.abs(x - PISTE.x) > 200) return null;
  const angle = Math.atan2(yRoues - ILE.hauteurPlateau, distance) * 180 / Math.PI;
  return [1.5, 0.5, -0.5, -1.5].map((ecart) => angle > CONFIG.pentePAPI + ecart);
}

// Petit raccourci pour fabriquer une matière "low-poly"
function matiere(couleur, extra = {}) {
  return new THREE.MeshStandardMaterial({ color: couleur, flatShading: true, ...extra });
}
function lampe(couleur) {
  return new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 1.2 });
}

// Écrit un texte dans une image (pour les numéros de piste et les panneaux)
function texteEnImage(texte, { largeur = 512, hauteur = 512, fond = null, couleur = '#ffffff', police = 'bold 360px Arial' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const g = canvas.getContext('2d');
  if (fond) { g.fillStyle = fond; g.fillRect(0, 0, largeur, hauteur); }
  g.font = police;
  g.fillStyle = couleur;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const mesure = g.measureText(texte).width;
  const resserrer = Math.min(1, (largeur * 0.92) / mesure);
  g.translate(largeur / 2, hauteur / 2);
  g.scale(resserrer, 1);
  g.fillText(texte, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Choisit la couleur du sol selon la hauteur
function couleurSelonHauteur(h) {
  if (h < 2.5) return new THREE.Color(CONFIG.couleurSable);
  if (h < 30) return new THREE.Color(CONFIG.couleurHerbe);
  if (h < 75) return new THREE.Color(CONFIG.couleurRoche);
  return new THREE.Color(CONFIG.couleurNeige);
}

// ---------- L'île ----------
function creerIle() {
  const taille = ILE.rayon * 2.2;
  const geo = new THREE.PlaneGeometry(taille, taille, 120, 120);
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
// Les lumières PAPI, qu'on rallume à chaque image
const ampoulesPAPI = [];

function creerPiste() {
  const groupe = new THREE.Group();
  const y = ILE.hauteurPlateau;
  const L = PISTE.longueur;
  const l = PISTE.largeur;
  const blanc = matiere(0xffffff);

  // Peint un rectangle blanc sur la piste
  function peinture(largeur, longueur, x, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(largeur, 0.04, longueur), blanc);
    m.position.set(x, y + 0.07, z);
    groupe.add(m);
  }

  // Les accotements (bords en béton clair) et le goudron
  const accotements = new THREE.Mesh(new THREE.BoxGeometry(l + 10, 0.16, L + 10), matiere(0x8a8a8a));
  accotements.position.y = y - 0.09;
  const goudron = new THREE.Mesh(new THREE.BoxGeometry(l, 0.2, L), matiere(CONFIG.couleurPiste));
  goudron.position.y = y - 0.05;
  groupe.add(accotements, goudron);

  // Les lignes blanches sur les bords
  for (const cote of [-1, 1]) peinture(0.8, L - 4, cote * (l / 2 - 1.5), 0);

  // La ligne pointillée au milieu
  for (let z = -L / 2 + 75; z <= L / 2 - 75; z += 35) peinture(1, 20, 0, z);

  // Les deux bouts de la piste : "36" au sud, "18" au nord
  for (const bout of [1, -1]) {
    const zSeuil = bout * L / 2;
    const versLeCentre = -bout;
    const a = (distance) => zSeuil + versLeCentre * distance; // position à X mètres du seuil

    // Les bandes du seuil (le "piano")
    for (let i = 0; i < 4; i++) {
      for (const cote of [-1, 1]) peinture(1.8, 30, cote * (3.5 + i * 4), a(21));
    }

    // Le numéro de la piste
    const numero = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 16),
      new THREE.MeshStandardMaterial({ map: texteEnImage(bout === 1 ? '36' : '18'), transparent: true, depthWrite: false })
    );
    numero.rotation.set(-Math.PI / 2, 0, bout === 1 ? 0 : Math.PI);
    numero.position.set(0, y + 0.08, a(50));
    groupe.add(numero);

    // Les marques de la zone de toucher et le "point de visée" (les deux gros rectangles)
    for (const cote of [-1, 1]) {
      for (let i = 0; i < 3; i++) peinture(1.2, 22, cote * (5.5 + i * 2), a(80));
      peinture(4, 45, cote * 8, a(140));
      for (let i = 0; i < 2; i++) peinture(1.2, 22, cote * (5.5 + i * 2), a(215));
    }

    // Les lumières vertes du seuil
    for (let x = -l / 2; x <= l / 2; x += 4) {
      const feu = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 6), lampe(0x22ff66));
      feu.position.set(x, y + 0.2, zSeuil + bout * 2);
      groupe.add(feu);
    }
  }

  // Les lumières blanches le long des bords
  for (let z = -L / 2; z <= L / 2; z += 40) {
    for (const cote of [-1, 1]) {
      const feu = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.6, 6), lampe(0xfff3c4));
      feu.position.set(cote * (l / 2 + 3), y + 0.3, z);
      groupe.add(feu);
    }
  }

  // La rampe d'approche : des lumières sur des poteaux avant la piste (côté sud)
  for (let k = 1; k <= 5; k++) {
    const z = L / 2 + 25 * k;
    const sol = Math.max(hauteurDuSol(PISTE.x, PISTE.z + z), 0);
    const hauteurPoteau = y + 0.6 - sol;
    for (let x = -4; x <= 4; x += 2) {
      const poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, hauteurPoteau, 5), matiere(0x999999));
      poteau.position.set(x, sol + hauteurPoteau / 2, z);
      const feu = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), lampe(0xffffff));
      feu.position.set(x, y + 0.8, z);
      groupe.add(poteau, feu);
    }
  }

  // Les lumières PAPI, à gauche de la piste
  for (let i = 0; i < 4; i++) {
    const socle = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.6), matiere(0x555555));
    socle.position.set(-(l / 2 + 10 + i * 4), y + 0.4, PAPI_Z - PISTE.z);
    const ampoule = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 0.6), lampe(0xff2020));
    ampoule.position.set(socle.position.x, y + 1.3, socle.position.z + 0.6);
    groupe.add(socle, ampoule);
    ampoulesPAPI.push(ampoule);
  }

  groupe.position.set(PISTE.x, 0, PISTE.z);
  return groupe;
}

// ---------- L'aéroport : voie de circulation, parking, hangar ----------
function creerAeroport() {
  const groupe = new THREE.Group();
  const y = ILE.hauteurPlateau;
  const beton = matiere(0x6b6b6b);
  const jaune = matiere(0xffd400);

  // La voie de circulation (le "taxiway") entre la piste et le parking
  const xDebut = PISTE.x + PISTE.largeur / 2;
  const longueurTaxi = PARKING.x0 - xDebut;
  const zTaxi = -540;
  const taxi = new THREE.Mesh(new THREE.BoxGeometry(longueurTaxi, 0.2, 16), beton);
  taxi.position.set(xDebut + longueurTaxi / 2, y - 0.06, zTaxi);
  const ligneTaxi = new THREE.Mesh(new THREE.BoxGeometry(longueurTaxi, 0.04, 0.5), jaune);
  ligneTaxi.position.set(taxi.position.x, y + 0.06, zTaxi);
  groupe.add(taxi, ligneTaxi);

  // Le parking des avions
  const largeur = PARKING.x1 - PARKING.x0;
  const profondeur = PARKING.z1 - PARKING.z0;
  const parking = new THREE.Mesh(new THREE.BoxGeometry(largeur, 0.2, profondeur), beton);
  parking.position.set((PARKING.x0 + PARKING.x1) / 2, y - 0.06, (PARKING.z0 + PARKING.z1) / 2);
  groupe.add(parking);
  // Une ligne jaune pour guider l'avion jusqu'à sa place
  const ligneParking = new THREE.Mesh(new THREE.BoxGeometry(35, 0.04, 0.5), jaune);
  ligneParking.position.set(PARKING.x0 + 17.5, y + 0.06, zTaxi);
  groupe.add(ligneParking);

  // Le hangar : un toit arrondi, ouvert vers le parking
  const hangar = new THREE.Group();
  const rayon = 16;
  const longueur = 36;
  const metal = matiere(0xc9d1d9, { side: THREE.DoubleSide });
  const toit = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon, longueur, 16, 1, true, Math.PI / 2, Math.PI), metal);
  toit.rotation.x = Math.PI / 2;
  const fond = new THREE.Mesh(new THREE.CircleGeometry(rayon, 16, 0, Math.PI), metal);
  fond.position.z = -longueur / 2;
  const interieur = new THREE.Mesh(new THREE.CircleGeometry(rayon - 0.5, 16, 0, Math.PI), matiere(0x2b2b2b));
  interieur.position.z = longueur / 2 - 1.5;
  const panneau = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 3.2),
    new THREE.MeshStandardMaterial({ map: texteEnImage(CONFIG.nomAvion, { largeur: 1024, hauteur: 200, fond: '#1d4ed8', police: 'bold 130px Arial' }) })
  );
  panneau.position.set(0, 11.5, longueur / 2 + 0.05);
  hangar.add(toit, fond, interieur, panneau);
  const xHangar = 132;
  const zHangar = PARKING.z0 - longueur / 2 - 4;
  hangar.position.set(xHangar, y, zHangar);
  groupe.add(hangar);
  ajouterObstacle(xHangar, zHangar, 20, y + rayon);

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
  ajouterObstacle(TOUR.x, TOUR.z, 5, sol + 23.5);
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

// ---------- Le grand panneau "Bienvenue à ILYZGO COUNTRY" ----------
function creerPanneauBienvenue() {
  const groupe = new THREE.Group();
  const largeur = 36;
  const hauteur = 11;
  const hauteurPoteaux = 6;

  // L'image du panneau : un ciel bleu, une mer, et le nom de l'île
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 312;
  const g = canvas.getContext('2d');
  const degrade = g.createLinearGradient(0, 0, 0, 312);
  degrade.addColorStop(0, '#2b7de9');
  degrade.addColorStop(0.75, '#5ec8ff');
  degrade.addColorStop(0.75, '#f4dc8a');
  degrade.addColorStop(1, '#f4dc8a');
  g.fillStyle = degrade;
  g.fillRect(0, 0, 1024, 312);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 14;
  g.strokeRect(7, 7, 1010, 298);
  // Un petit soleil
  g.fillStyle = '#ffd400';
  g.beginPath();
  g.arc(930, 70, 38, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = 'bold 50px Arial, sans-serif';
  g.fillText('Bienvenue à', 512, 62);
  g.font = 'bold 120px "Arial Black", Arial, sans-serif';
  g.lineWidth = 10;
  g.strokeStyle = '#16324f';
  const mesure = g.measureText(CONFIG.nomIle).width;
  g.save();
  g.translate(512, 160);
  g.scale(Math.min(1, 940 / mesure), 1);
  g.strokeText(CONFIG.nomIle, 0, 0);
  g.fillText(CONFIG.nomIle, 0, 0);
  g.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  // Le cadre en bois et l'image devant
  const cadre = new THREE.Mesh(new THREE.BoxGeometry(largeur + 1, hauteur + 1, 0.6), matiere(0x7a4b2a));
  cadre.position.y = hauteurPoteaux + hauteur / 2;
  const image = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshStandardMaterial({ map: texture }));
  image.position.set(0, cadre.position.y, 0.31);
  groupe.add(cadre, image);
  for (const cote of [-1, 1]) {
    const poteau = new THREE.Mesh(new THREE.BoxGeometry(0.8, hauteurPoteaux + 1, 0.8), matiere(0x7a4b2a));
    poteau.position.set(cote * largeur * 0.35, (hauteurPoteaux + 1) / 2, -0.2);
    groupe.add(poteau);
  }

  // Le panneau regarde vers le début de la piste (là où l'avion démarre)
  const sol = hauteurDuSol(PANNEAU.x, PANNEAU.z);
  groupe.position.set(PANNEAU.x, sol, PANNEAU.z);
  groupe.rotation.y = Math.atan2(PISTE.x - PANNEAU.x, (SEUIL_SUD - 30) - PANNEAU.z);
  ajouterObstacle(PANNEAU.x, PANNEAU.z, largeur / 2, sol + hauteurPoteaux + hauteur + 0.5);
  return groupe;
}

// ---------- Les lettres géantes sur la montagne (comme à Hollywood !) ----------
function creerLettresMontagne(scene) {
  const texte = CONFIG.nomIle;
  const largeurLettre = 14;
  const hauteurLettre = 20;
  const espace = 15;
  const zLigne = MONTAGNE.z + 110; // sur la pente sud de la montagne, face à la piste

  for (let i = 0; i < texte.length; i++) {
    const lettre = texte[i];
    if (lettre === ' ') continue;

    // On dessine la lettre en blanc sur une image transparente
    const canvas = document.createElement('canvas');
    canvas.width = 140;
    canvas.height = 200;
    const g = canvas.getContext('2d');
    g.font = 'bold 190px "Arial Black", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 8;
    g.strokeStyle = '#9aa5b1';
    g.strokeText(lettre, 70, 108);
    g.fillStyle = '#ffffff';
    g.fillText(lettre, 70, 108);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(largeurLettre, hauteurLettre);
    geo.translate(0, hauteurLettre / 2, 0); // la lettre "pousse" à partir du sol
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: texture, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide,
    }));
    const x = MONTAGNE.x + (i - (texte.length - 1) / 2) * espace;
    const sol = Math.max(hauteurDuSol(x, zLigne), 1);
    mesh.position.set(x, sol - 1, zLigne);
    mesh.rotation.x = -0.35; // penchée en arrière, posée contre la pente
    scene.add(mesh);
  }
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
    ajouterObstacle(x, z, maison.userData.rayon, sol + maison.userData.hauteur);
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
    // Pas dans l'eau, pas trop haut, pas sur l'aérodrome, pas dans le village
    if (h < 3 || h > 40) continue;
    if (distanceAuRectangle(x, z, ZONE_PISTE) < 35) continue;
    if (distanceAuRectangle(x, z, ZONE_AEROPORT) < 15) continue;
    if (Math.abs(x - PISTE.x) < 30 && z > SEUIL_SUD) continue; // la rampe d'approche
    if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.rayon + 8) continue;
    if (Math.hypot(x - PANNEAU.x, z - PANNEAU.z) < 30) continue;

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
  scene.fog = new THREE.Fog(CONFIG.couleurCiel, 500, 1800);

  // Les lumières : le soleil + une lumière douce venant du ciel
  const soleil = new THREE.DirectionalLight(0xffffff, 2.2);
  soleil.position.set(200, 400, 100);
  scene.add(soleil);
  scene.add(new THREE.HemisphereLight(0xbfe6ff, 0x3d6b3d, 1.0));

  // La mer : un grand carré bleu
  const mer = new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.tailleMonde, CONFIG.tailleMonde), matiere(CONFIG.couleurMer));
  mer.rotation.x = -Math.PI / 2;
  scene.add(mer);

  scene.add(creerIle());
  scene.add(creerPiste());
  scene.add(creerAeroport());
  scene.add(creerTour());
  scene.add(creerMancheAAir(-40, SEUIL_SUD - 60));
  scene.add(creerPanneauBienvenue());
  creerLettresMontagne(scene);
  creerVillage(scene);
  creerArbres(scene);
}

// Appelé à chaque image : allume les lumières PAPI selon la hauteur de l'avion
export function mettreAJourMonde(etatAvion) {
  const p = etatAvion.position;
  const blanches = lumieresPAPI(p.x, p.y - CONFIG.hauteurRoues, p.z) ?? [false, false, false, false];
  ampoulesPAPI.forEach((ampoule, i) => {
    const couleur = blanches[i] ? 0xffffff : 0xff2020;
    ampoule.material.color.setHex(couleur);
    ampoule.material.emissive.setHex(couleur);
  });
}
