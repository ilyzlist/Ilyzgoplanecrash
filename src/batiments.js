// ============================================================
//  LES BÂTIMENTS DE L'AÉROPORT ET D'ILYZGO CITY
//  - l'aérogare avec le contrôle des passeports
//  - le parking des voitures et la route
//  - ILYZGO CITY : le supermarché ILYZGO MARKET, des maisons, une fontaine
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  hauteurDuSol, ajouterObstacle, ajouterObstacleRectangle, creerHasard, creerMaison,
  matiere, lampe, texteEnImage, distanceAuRectangle,
  AEROGARE, PARKING_VOITURES, ROUTE, VILLE,
} from './world.js';
import { creerFigurine } from './character.js';
import { dessinerDrapeauIlyzgo, dessinerDrapeauEurope } from './drapeaux.js';

const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);

// Un panneau avec du texte (une image posée sur un plan)
function panneau(texte, largeur, hauteur, options) {
  const ratio = largeur / hauteur;
  const pixelsHauteur = 160;
  const image = texteEnImage(texte, {
    largeur: Math.round(pixelsHauteur * ratio), hauteur: pixelsHauteur,
    police: 'bold 100px Arial, sans-serif', ...options,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshStandardMaterial({ map: image }));
}

// Une image faite avec un canvas, posée sur un plan
function planImage(canvas, largeur, hauteur) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur),
    new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide }));
}

// ---------- Le contrôle des passeports ----------
// La zone où se trouve le policier : quand le personnage la traverse, on regarde son passeport
const CONTROLE = { x0: 184, x1: 192, z0: AEROGARE.passageZ0, z1: AEROGARE.passageZ1 };
export function dansControlePasseport(x, z) {
  return distanceAuRectangle(x, z, CONTROLE) === 0;
}

// ---------- L'aérogare ----------
function creerAerogare(scene) {
  const A = AEROGARE;
  const y = hauteurDuSol((A.x0 + A.x1) / 2, (A.z0 + A.z1) / 2);
  const hauteur = 9;
  const murs = matiere(0xf1f3f5);
  const vitres = matiere(0x7cc7ff, { metalness: 0.4, roughness: 0.15 });
  const largeur = A.x1 - A.x0;
  const xMilieu = (A.x0 + A.x1) / 2;

  // Le sol en dalles claires, sous l'aérogare et devant
  const dalles = boite(PARKING_VOITURES.x0 - 160, 0.2, A.z1 - A.z0 + 10, matiere(0xc8ccd2));
  dalles.position.set((160 + PARKING_VOITURES.x0) / 2, y - 0.06, (A.z0 + A.z1) / 2);
  scene.add(dalles);

  // Les deux ailes du bâtiment, de chaque côté du passage
  for (const [z0, z1] of [[A.z0, A.passageZ0], [A.passageZ1, A.z1]]) {
    const profondeur = z1 - z0;
    const zMilieu = (z0 + z1) / 2;
    const aile = boite(largeur, hauteur, profondeur, murs);
    aile.position.set(xMilieu, y + hauteur / 2, zMilieu);
    scene.add(aile);
    // Les grandes vitres, côté avions et côté parking
    for (const cote of [-1, 1]) {
      const vitre = boite(0.2, hauteur - 3, profondeur - 4, vitres);
      vitre.position.set(xMilieu + cote * (largeur / 2 + 0.05), y + hauteur / 2 + 0.5, zMilieu);
      scene.add(vitre);
    }
    ajouterObstacleRectangle(A.x0, A.x1, z0, z1, y + hauteur + 0.6);
  }

  // Le grand toit blanc qui couvre tout (et le passage)
  const toit = boite(largeur + 4, 0.6, A.z1 - A.z0 + 4, matiere(0xd0d5db));
  toit.position.set(xMilieu, y + hauteur + 0.3, (A.z0 + A.z1) / 2);
  scene.add(toit);

  // Le nom de l'aéroport, sur le toit, des deux côtés
  for (const cote of [-1, 1]) {
    const nom = panneau("AÉROPORT INTERNATIONAL D'ILYZGO", 44, 4, { fond: '#1d4ed8' });
    nom.position.set(xMilieu + cote * (largeur / 2 + 2.05), y + hauteur + 2.8, (A.z0 + A.z1) / 2);
    nom.rotation.y = cote * Math.PI / 2;
    const support = boite(0.5, 4.6, 44.6, matiere(0x1d4ed8));
    support.position.set(xMilieu + cote * (largeur / 2 + 1.75), y + hauteur + 2.8, (A.z0 + A.z1) / 2);
    scene.add(support, nom);
  }

  // Dans le passage : le panneau "CONTRÔLE DES PASSEPORTS", la cabine et le policier
  const zPassage = (A.passageZ0 + A.passageZ1) / 2;
  const largeurPassage = A.passageZ1 - A.passageZ0;
  const panneauControle = panneau('🛂 CONTRÔLE DES PASSEPORTS', largeurPassage - 1, 1.6, { fond: '#16324f' });
  panneauControle.position.set(A.x1 - 2, y + 6.5, zPassage);
  panneauControle.rotation.y = Math.PI / 2;
  scene.add(panneauControle);

  // Le comptoir du policier, avec une petite vitre
  const comptoir = boite(3.4, 1.2, 0.8, matiere(0x16324f));
  comptoir.position.set(188, y + 0.6, A.passageZ0 + 1.6);
  const vitreComptoir = boite(3.2, 0.9, 0.08, vitres);
  vitreComptoir.position.set(188, y + 1.65, A.passageZ0 + 1.6);
  scene.add(comptoir, vitreComptoir);
  ajouterObstacleRectangle(186, 190, A.passageZ0, A.passageZ0 + 2, y + 2.2);

  const policier = creerFigurine({
    nom: 'Police', tshirt: '#1d3557', short: '#1d3557', peau: '#d9a066', cheveux: '#222222',
    chaussures: '#111111', coiffure: 'casquette', casquette: '#1d3557',
  });
  policier.position.set(188, y, A.passageZ0 + 0.6);
  policier.rotation.y = Math.PI; // il regarde vers le passage
  scene.add(policier);

  // Une ligne jaune au sol : "attendez ici"
  const ligne = boite(0.4, 0.05, largeurPassage - 3, matiere(0xffd400));
  ligne.position.set(194, y + 0.04, zPassage + 1);
  scene.add(ligne);

  // Les drapeaux devant l'aérogare : ILYZGO et Europe
  const drapeaux = [
    { canvas: dessinerDrapeauIlyzgo(300, 200), z: zPassage - 30 },
    { canvas: dessinerDrapeauEurope(300, 200), z: zPassage + 30 },
  ];
  for (const { canvas, z } of drapeaux) {
    const x = A.x1 + 6;
    const sol = hauteurDuSol(x, z);
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 12, 8), matiere(0xdddddd));
    mat.position.set(x, sol + 6, z);
    const drapeau = planImage(canvas, 4.5, 3);
    drapeau.position.set(x, sol + 10.4, z + 2.3);
    drapeau.rotation.y = Math.PI / 2;
    scene.add(mat, drapeau);
    ajouterObstacle(x, z, 0.5, sol + 12);
  }
}

// ---------- Une voiture ----------
function creerVoiture(couleur) {
  const voiture = new THREE.Group();
  const carrosserie = boite(2, 0.9, 4.4, matiere(couleur));
  carrosserie.position.y = 0.75;
  const habitacle = boite(1.8, 0.7, 2.3, matiere(0x9fd8ff, { metalness: 0.3, roughness: 0.2 }));
  habitacle.position.set(0, 1.55, 0.2);
  const toit = boite(1.82, 0.12, 2.0, matiere(couleur));
  toit.position.set(0, 1.94, 0.2);
  voiture.add(carrosserie, habitacle, toit);
  const geoRoue = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  geoRoue.rotateZ(Math.PI / 2);
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.4, 1.4]) {
      const roue = new THREE.Mesh(geoRoue, matiere(0x1b1b1b));
      roue.position.set(x, 0.38, z);
      voiture.add(roue);
    }
  }
  for (const x of [-0.6, 0.6]) {
    const phare = boite(0.4, 0.2, 0.05, lampe(0xfff3c4));
    phare.position.set(x, 0.85, -2.21);
    const feu = boite(0.4, 0.2, 0.05, lampe(0xff2020));
    feu.position.set(x, 0.85, 2.21);
    voiture.add(phare, feu);
  }
  return voiture;
}

// ---------- Le parking des voitures ----------
function creerParkingVoitures(scene) {
  const P = PARKING_VOITURES;
  const y = hauteurDuSol((P.x0 + P.x1) / 2, (P.z0 + P.z1) / 2);
  const sol = boite(P.x1 - P.x0, 0.2, P.z1 - P.z0, matiere(0x4a4a4a));
  sol.position.set((P.x0 + P.x1) / 2, y - 0.06, (P.z0 + P.z1) / 2);
  scene.add(sol);

  // Les places : une rangée de chaque côté, sauf au milieu (le chemin vers l'aérogare)
  const places = [];
  for (const [x, angle] of [[P.x0 + 7, -Math.PI / 2], [P.x1 - 7, Math.PI / 2]]) {
    for (let z = P.z0 + 5; z < P.z1 - 3; z += 6) {
      if (Math.abs(z + 540) < 12) continue; // le chemin des piétons
      places.push({ x, z, angle });
      const ligne = boite(12, 0.04, 0.25, matiere(0xffffff));
      ligne.position.set(x, y + 0.06, z - 3);
      scene.add(ligne);
    }
  }
  // Un passage piéton blanc jusqu'à l'aérogare
  for (let z = -546; z <= -534; z += 2.4) {
    const bande = boite(10, 0.04, 1.2, matiere(0xffffff));
    bande.position.set(P.x0 - 5, y + 0.06, z);
    scene.add(bande);
  }

  // Les voitures garées
  const hasard = creerHasard(77);
  const nombre = Math.min(CONFIG.nombreVoitures, places.length);
  for (let i = 0; i < nombre; i++) {
    const place = places.splice(Math.floor(hasard() * places.length), 1)[0];
    const couleur = CONFIG.couleursVoitures[Math.floor(hasard() * CONFIG.couleursVoitures.length)];
    const voiture = creerVoiture(couleur);
    voiture.position.set(place.x, y, place.z);
    voiture.rotation.y = place.angle;
    scene.add(voiture);
    ajouterObstacle(place.x, place.z, 2.4, y + 2);
  }

  // Le panneau "P"
  const p = panneau('P', 3, 3, { fond: '#1d4ed8', police: 'bold 130px Arial' });
  const poteau = boite(0.2, 4, 0.2, matiere(0x999999));
  poteau.position.set(P.x1 + 2, y + 2, P.z1 - 4);
  p.position.set(P.x1 + 2, y + 5.3, P.z1 - 4 + 0.12);
  scene.add(poteau, p);
}

// ---------- La route et ses lampadaires ----------
function creerRoute(scene) {
  const R = ROUTE;
  const longueur = R.z1 - R.z0;
  const xMilieu = (R.x0 + R.x1) / 2;
  const y = hauteurDuSol(xMilieu, (R.z0 + R.z1) / 2);
  const route = boite(R.x1 - R.x0, 0.2, longueur, matiere(0x3d3d3d));
  route.position.set(xMilieu, y - 0.05, (R.z0 + R.z1) / 2);
  scene.add(route);
  for (let z = R.z0 + 4; z < R.z1; z += 8) {
    const trait = boite(0.3, 0.04, 4, matiere(0xffffff));
    trait.position.set(xMilieu, y + 0.07, z);
    scene.add(trait);
  }
  // Les lampadaires
  for (let z = R.z0 + 10; z < R.z1; z += 25) {
    for (const cote of [-1, 1]) {
      const x = xMilieu + cote * 7;
      const sol = hauteurDuSol(x, z);
      const pied = boite(0.25, 6, 0.25, matiere(0x555555));
      pied.position.set(x, sol + 3, z);
      const bras = boite(1.6, 0.2, 0.2, matiere(0x555555));
      bras.position.set(x - cote * 0.8, sol + 6, z);
      const ampoule = boite(0.6, 0.25, 0.4, lampe(0xfff3c4));
      ampoule.position.set(x - cote * 1.4, sol + 5.85, z);
      scene.add(pied, bras, ampoule);
    }
  }
  // Le panneau d'entrée de la ville
  const nom = panneau(CONFIG.nomVille, 8, 2, { fond: '#ffffff', couleur: '#16324f' });
  const x = R.x1 + 5;
  const z = VILLE.z - VILLE.rayon + 10;
  const sol = hauteurDuSol(x, z);
  const support = boite(0.2, 3, 0.2, matiere(0x999999));
  support.position.set(x, sol + 1.5, z);
  nom.position.set(x, sol + 3.6, z - 0.12);
  nom.rotation.y = Math.PI; // on le lit en arrivant de l'aéroport
  scene.add(support, nom);
}

// ---------- Le supermarché ILYZGO MARKET ----------
const SUPERMARCHE = { x0: 165, x1: 205, z0: -410, z1: -385 };
function creerSupermarche(scene) {
  const S = SUPERMARCHE;
  const xMilieu = (S.x0 + S.x1) / 2;
  const zMilieu = (S.z0 + S.z1) / 2;
  const y = hauteurDuSol(xMilieu, zMilieu);
  const hauteur = 8;

  // Le bâtiment, avec une bande rouge en haut
  const batiment = boite(S.x1 - S.x0, hauteur, S.z1 - S.z0, matiere(0xfafafa));
  batiment.position.set(xMilieu, y + hauteur / 2, zMilieu);
  const bande = boite(S.x1 - S.x0 + 0.2, 1.4, S.z1 - S.z0 + 0.2, matiere(0xe63946));
  bande.position.set(xMilieu, y + hauteur - 0.7, zMilieu);
  scene.add(batiment, bande);
  ajouterObstacleRectangle(S.x0, S.x1, S.z0, S.z1, y + hauteur + 4);

  // L'entrée vitrée et l'auvent, côté route (est)
  const entree = boite(0.2, 3.6, 8, matiere(0x7cc7ff, { metalness: 0.4, roughness: 0.15 }));
  entree.position.set(S.x1 + 0.1, y + 1.8, zMilieu);
  const auvent = boite(3, 0.3, 10, matiere(0xffbe0b));
  auvent.position.set(S.x1 + 1.5, y + 4, zMilieu);
  scene.add(entree, auvent);

  // Le grand nom sur le toit (vers la route) et sur la façade (vers la ville)
  const nomEst = panneau('🛒 ILYZGO MARKET', 22, 3.6, { fond: '#e63946' });
  nomEst.position.set(S.x1 + 0.2, y + hauteur + 2, zMilieu);
  nomEst.rotation.y = Math.PI / 2;
  const supportEst = boite(0.3, 4, 22.4, matiere(0xe63946));
  supportEst.position.set(S.x1 - 0.05, y + hauteur + 2, zMilieu);
  const nomSud = panneau('ILYZGO MARKET', 20, 3, { fond: '#e63946' });
  nomSud.position.set(xMilieu, y + hauteur - 2.6, S.z1 + 0.12);
  scene.add(supportEst, nomEst, nomSud);

  // Les chariots devant l'entrée
  const metal = matiere(0xb8bec7);
  for (let i = 0; i < 4; i++) {
    const chariot = new THREE.Group();
    const panier = boite(0.9, 0.7, 1.3, metal);
    panier.position.y = 1;
    const poignee = boite(0.9, 0.08, 0.08, matiere(0xe63946));
    poignee.position.set(0, 1.45, 0.7);
    chariot.add(panier, poignee);
    for (const x of [-0.35, 0.35]) {
      for (const z of [-0.5, 0.5]) {
        const roue = boite(0.12, 0.25, 0.25, matiere(0x222222));
        roue.position.set(x, 0.12, z);
        chariot.add(roue);
      }
    }
    chariot.position.set(S.x1 + 3.5, y, zMilieu + 6 + i * 1.1);
    scene.add(chariot);
  }

  // Le petit parking du supermarché
  const parking = boite(20, 0.2, S.z1 - S.z0, matiere(0x4a4a4a));
  parking.position.set(S.x1 + 12, y - 0.06, zMilieu);
  scene.add(parking);
}

// ---------- La fontaine au centre d'ILYZGO CITY ----------
function creerFontaine(scene) {
  const y = hauteurDuSol(VILLE.x, VILLE.z);
  const pierre = matiere(0xd9d2c5);
  const eau = new THREE.MeshStandardMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.85, roughness: 0.1 });

  const place = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.1, 32), matiere(0xcfcfcf));
  place.position.set(VILLE.x, y + 0.05, VILLE.z);
  const bassin = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.4, 1, 24), pierre);
  bassin.position.set(VILLE.x, y + 0.5, VILLE.z);
  const surface = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.1, 24), eau);
  surface.position.set(VILLE.x, y + 0.9, VILLE.z);
  const colonne = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 3, 10), pierre);
  colonne.position.set(VILLE.x, y + 2, VILLE.z);
  const vasque = new THREE.Mesh(new THREE.CylinderGeometry(2, 1, 0.6, 16), pierre);
  vasque.position.set(VILLE.x, y + 3.6, VILLE.z);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 10), eau);
  jet.position.set(VILLE.x, y + 5.3, VILLE.z);
  scene.add(place, bassin, surface, colonne, vasque, jet);
  ajouterObstacle(VILLE.x, VILLE.z, 6.4, y + 1.5);

  // Des bancs autour de la place
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const banc = new THREE.Group();
    const assise = boite(3, 0.2, 0.8, matiere(0x8e5a3c));
    assise.position.y = 0.6;
    const dossier = boite(3, 0.7, 0.15, matiere(0x8e5a3c));
    dossier.position.set(0, 1.0, 0.4);
    banc.add(assise, dossier);
    for (const x of [-1.2, 1.2]) {
      const pied = boite(0.15, 0.6, 0.6, matiere(0x333333));
      pied.position.set(x, 0.3, 0);
      banc.add(pied);
    }
    banc.position.set(VILLE.x + Math.cos(angle) * 11, y, VILLE.z + Math.sin(angle) * 11);
    banc.rotation.y = Math.atan2(VILLE.x - banc.position.x, VILLE.z - banc.position.z) + Math.PI;
    scene.add(banc);
  }
}

// ---------- Les maisons d'ILYZGO CITY ----------
function creerMaisonsVille(scene) {
  const hasard = creerHasard(2024);
  const placees = [];
  for (let essai = 0; essai < 2000 && placees.length < CONFIG.nombreMaisonsVille; essai++) {
    const angle = hasard() * Math.PI * 2;
    const r = 30 + hasard() * 50;
    const x = VILLE.x + Math.cos(angle) * r;
    const z = VILLE.z + Math.sin(angle) * r;
    // Pas sur le supermarché, ni sur la route, ni trop près d'une autre maison
    if (distanceAuRectangle(x, z, SUPERMARCHE) < 12) continue;
    if (distanceAuRectangle(x, z, ROUTE) < 10) continue;
    if (x > SUPERMARCHE.x1 && x < ROUTE.x0 && z < SUPERMARCHE.z1 + 5) continue; // le parking du supermarché
    if (placees.some((m) => Math.hypot(m.x - x, m.z - z) < 22)) continue;
    placees.push({ x, z });

    const maison = creerMaison(hasard);
    const sol = hauteurDuSol(x, z);
    maison.position.set(x, sol, z);
    // La porte de la maison regarde vers la fontaine
    maison.rotation.y = Math.atan2(VILLE.x - x, VILLE.z - z);
    scene.add(maison);
    ajouterObstacle(x, z, maison.userData.rayon, sol + maison.userData.hauteur);
  }
}

export function creerAeroportEtVille(scene) {
  creerAerogare(scene);
  creerParkingVoitures(scene);
  creerRoute(scene);
  creerSupermarche(scene);
  creerFontaine(scene);
  creerMaisonsVille(scene);
}
