// ============================================================
//  LE PERSONNAGE : une figurine qui marche, court, saute
//  et peut monter dans l'avion.
//  L'avant du personnage regarde vers -Z (comme l'avion).
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { hauteurDuSol, hauteurDesObstacles } from './world.js';
import { lireAvancer, lireTourner, courir, prendreSaut } from './controls.js';

const matiere = (couleur) => new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.7, flatShading: true });
const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);

// L'initiale du prénom, imprimée sur le t-shirt
function texteTshirt(lettre, couleurFond) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  g.fillStyle = couleurFond;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff';
  g.font = 'bold 84px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lettre, 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ---------- Fabrique la figurine d'un personnage (une ligne de PERSONNAGES dans config.js) ----------
export function creerFigurine(perso) {
  const figurine = new THREE.Group();
  const peau = matiere(perso.peau);
  const tshirt = matiere(perso.tshirt);
  const short = matiere(perso.short);
  const cheveux = matiere(perso.cheveux);
  const chaussures = matiere(perso.chaussures);
  const noir = matiere(0x111111);

  // Les jambes (elles tournent autour des hanches pour marcher)
  const jambes = [];
  for (const cote of [-1, 1]) {
    const hanche = new THREE.Group();
    hanche.position.set(cote * 0.2, 0.95, 0);
    const cuisse = boite(0.3, 0.4, 0.32, short);
    cuisse.position.y = -0.2;
    const mollet = boite(0.26, 0.42, 0.28, peau);
    mollet.position.y = -0.6;
    const chaussure = boite(0.3, 0.16, 0.42, chaussures);
    chaussure.position.set(0, -0.87, -0.05);
    hanche.add(cuisse, mollet, chaussure);
    figurine.add(hanche);
    jambes.push(hanche);
  }

  // Le corps, avec l'initiale du prénom sur le devant du t-shirt
  const devant = new THREE.MeshStandardMaterial({ map: texteTshirt(perso.nom[0], perso.tshirt), roughness: 0.7 });
  const corps = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.45), [tshirt, tshirt, tshirt, tshirt, tshirt, devant]);
  corps.position.y = 1.32;
  figurine.add(corps);

  // Les bras (ils se balancent en marchant)
  const bras = [];
  for (const cote of [-1, 1]) {
    const epaule = new THREE.Group();
    epaule.position.set(cote * 0.52, 1.62, 0);
    const manche = boite(0.24, 0.3, 0.28, tshirt);
    manche.position.y = -0.12;
    const avantBras = boite(0.2, 0.4, 0.24, peau);
    avantBras.position.y = -0.47;
    epaule.add(manche, avantBras);
    figurine.add(epaule);
    bras.push(epaule);
  }

  // La tête, les yeux et le sourire
  const tete = boite(0.62, 0.6, 0.58, peau);
  tete.position.y = 2.02;
  figurine.add(tete);
  for (const cote of [-1, 1]) {
    const oeil = boite(0.09, 0.11, 0.04, noir);
    oeil.position.set(cote * 0.14, 2.07, -0.3);
    figurine.add(oeil);
  }
  const sourire = boite(0.22, 0.05, 0.04, matiere(0x8a2b2b));
  sourire.position.set(0, 1.88, -0.3);
  figurine.add(sourire);

  // La coiffure
  const dessus = boite(0.66, 0.16, 0.62, cheveux);
  dessus.position.y = 2.36;
  figurine.add(dessus);
  const arriereTete = boite(0.64, 0.4, 0.1, cheveux);
  arriereTete.position.set(0, 2.15, 0.27);
  figurine.add(arriereTete);

  if (perso.coiffure === 'pointes') {
    // Des petites mèches en pointes
    for (let i = 0; i < 7; i++) {
      const meche = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 4), cheveux);
      meche.position.set(-0.24 + (i % 4) * 0.16, 2.5, -0.15 + Math.floor(i / 4) * 0.28);
      meche.rotation.z = (i % 2 ? 0.25 : -0.25);
      figurine.add(meche);
    }
  } else if (perso.coiffure === 'casquette') {
    // Une casquette avec sa visière
    const casquette = boite(0.7, 0.2, 0.66, matiere(perso.casquette));
    casquette.position.y = 2.44;
    const visiere = boite(0.56, 0.06, 0.32, matiere(perso.casquette));
    visiere.position.set(0, 2.36, -0.45);
    figurine.add(casquette, visiere);
  } else if (perso.coiffure === 'boucles') {
    // Plein de petites boucles
    const geoBoucle = new THREE.SphereGeometry(0.13, 6, 5);
    for (let i = 0; i < 14; i++) {
      const boucle = new THREE.Mesh(geoBoucle, cheveux);
      const angle = (i / 14) * Math.PI * 2;
      boucle.position.set(Math.cos(angle) * 0.28, 2.42 + (i % 3) * 0.04, Math.sin(angle) * 0.27);
      figurine.add(boucle);
    }
    const sommet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), cheveux);
    sommet.position.y = 2.5;
    figurine.add(sommet);
  } else if (perso.coiffure === 'courts') {
    // Des cheveux courts avec une petite frange
    const frange = boite(0.64, 0.1, 0.12, cheveux);
    frange.position.set(0, 2.28, -0.26);
    figurine.add(frange);
  } else if (perso.coiffure === 'longs') {
    // Des cheveux longs qui tombent dans le dos et sur les côtés
    const frange = boite(0.64, 0.12, 0.12, cheveux);
    frange.position.set(0, 2.27, -0.26);
    const dos = boite(0.66, 0.85, 0.14, cheveux);
    dos.position.set(0, 1.85, 0.3);
    figurine.add(frange, dos);
    for (const cote of [-1, 1]) {
      const meche = boite(0.1, 0.7, 0.5, cheveux);
      meche.position.set(cote * 0.33, 1.95, 0.02);
      figurine.add(meche);
    }
  }

  // Les lunettes
  if (perso.lunettes) {
    const monture = matiere(0x222222);
    for (const cote of [-1, 1]) {
      const verre = boite(0.2, 0.16, 0.03, monture);
      verre.position.set(cote * 0.14, 2.07, -0.31);
      figurine.add(verre);
    }
    const pont = boite(0.1, 0.03, 0.03, monture);
    pont.position.set(0, 2.1, -0.31);
    figurine.add(pont);
  }

  figurine.userData = { jambes, bras };
  return figurine;
}

// Balance les bras et les jambes d'une figurine qui marche.
// pas = où on en est dans la marche, amplitude = 0 (immobile) à 1 (grands pas)
export function animerMarche(figurine, pas, amplitude) {
  const [jambeG, jambeD] = figurine.userData.jambes;
  const [brasG, brasD] = figurine.userData.bras;
  jambeG.rotation.x = Math.sin(pas) * amplitude;
  jambeD.rotation.x = -Math.sin(pas) * amplitude;
  brasG.rotation.x = -Math.sin(pas) * amplitude;
  brasD.rotation.x = Math.sin(pas) * amplitude;
}

// ---------- Le personnage qu'on contrôle à pied ----------
export function creerPieton(scene, perso) {
  const modele = creerFigurine(perso);
  scene.add(modele);

  const etat = {
    position: new THREE.Vector3(),
    angle: 0,       // direction où il regarde
    vitesse: 0,
    vitesseVerticale: 0,
    auSol: true,
  };
  let pas = 0; // pour balancer les bras et les jambes

  // Place le personnage à un endroit, en regardant dans une direction
  function placer(x, z, angle) {
    etat.position.set(x, hauteurDuSol(x, z), z);
    etat.angle = angle;
    etat.vitesse = 0;
    etat.vitesseVerticale = 0;
    modele.position.copy(etat.position);
    modele.rotation.y = angle;
  }

  function montrer(visible) {
    modele.visible = visible;
  }

  // Appelé à chaque image quand on joue à pied
  function mettreAJour(dt) {
    // Tourner et avancer
    etat.angle += lireTourner() * 2.6 * dt;
    const vitesseVoulue = lireAvancer() * (courir() ? CONFIG.vitesseCourse : CONFIG.vitesseMarche);
    etat.vitesse += (vitesseVoulue - etat.vitesse) * Math.min(1, dt * 8);

    const x = etat.position.x - Math.sin(etat.angle) * etat.vitesse * dt;
    const z = etat.position.z - Math.cos(etat.angle) * etat.vitesse * dt;
    const sol = hauteurDuSol(x, z);
    // On ne marche pas dans la mer, ni à travers les murs
    const bloque = sol < 0.3 || hauteurDesObstacles(x, z) > sol + 1;
    if (!bloque) {
      etat.position.x = x;
      etat.position.z = z;
    }

    // Sauter
    if (prendreSaut() && etat.auSol) {
      etat.vitesseVerticale = CONFIG.forceSaut;
      etat.auSol = false;
    }
    etat.vitesseVerticale -= 22 * dt; // la gravité
    etat.position.y += etat.vitesseVerticale * dt;
    const solIci = hauteurDuSol(etat.position.x, etat.position.z);
    if (etat.position.y <= solIci) {
      etat.position.y = solIci;
      etat.vitesseVerticale = 0;
      etat.auSol = true;
    }

    // Balancer les bras et les jambes en marchant
    pas += Math.abs(etat.vitesse) * dt * 2.2;
    const amplitude = Math.min(Math.abs(etat.vitesse) / CONFIG.vitesseMarche, 1.3) * 0.7;
    animerMarche(modele, pas, amplitude);
    const [brasG, brasD] = modele.userData.bras;
    if (!etat.auSol) { brasG.rotation.z = -0.6; brasD.rotation.z = 0.6; } // les bras en l'air !
    else { brasG.rotation.z = 0; brasD.rotation.z = 0; }

    modele.position.copy(etat.position);
    modele.rotation.y = etat.angle;
  }

  // La caméra suit derrière le personnage
  function suivreCamera(camera, dt) {
    const cible = new THREE.Vector3(
      etat.position.x + Math.sin(etat.angle) * CONFIG.cameraPietonDistance,
      etat.position.y + CONFIG.cameraPietonHauteur,
      etat.position.z + Math.cos(etat.angle) * CONFIG.cameraPietonDistance
    );
    camera.position.lerp(cible, Math.min(1, dt * CONFIG.cameraSouplesse));
    camera.lookAt(etat.position.x, etat.position.y + 1.6, etat.position.z);
  }

  return { etat, modele, placer, montrer, mettreAJour, suivreCamera };
}
