// ============================================================
//  MAIN : crée la scène et fait tourner la boucle du jeu
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  creerMonde, mettreAJourMonde, distanceALaPiste, lumieresPAPI,
  hauteurDuSol, ajouterObstacle, PARKING,
} from './world.js';
import { creerAvion, creerModele, kmh } from './plane.js';
import { mettreAJourHUD } from './ui.js';

// Le moteur de rendu (ce qui dessine à l'écran)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// La scène (le monde 3D) et la caméra (nos yeux)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 3000);

creerMonde(scene);
const avion = creerAvion(scene, camera);

// Un deuxième avion ILYZGO AIR, garé sur le parking de l'aéroport
const avionGare = creerModele();
const xGare = PARKING.x0 + 45;
const zGare = PARKING.z1 - 20;
avionGare.position.set(xGare, hauteurDuSol(xGare, zGare) + CONFIG.hauteurRoues, zGare);
avionGare.rotation.y = Math.PI / 2; // le nez tourné vers la piste
scene.add(avionGare);
ajouterObstacle(xGare, zGare, 6, avionGare.position.y + 1.5);

// Si on change la taille de la fenêtre, on adapte l'image
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Le tableau de bord en haut à gauche
function tableauDeBord() {
  const e = avion.etat;
  const crans = Math.round(e.gaz * 10);
  const lignes = [
    `<b>✈️ ${CONFIG.nomAvion}</b>`,
    `Vitesse : ${kmh(e.vitesse)} km/h`,
    `Altitude : ${Math.max(0, Math.round(e.hauteurSol))} m`,
    `Gaz : ${'█'.repeat(crans)}${'░'.repeat(10 - crans)} ${Math.round(e.gaz * 100)}%`,
  ];
  if (e.auSol) lignes.push(e.freins ? 'Au sol · 🛑 Freins' : 'Au sol');
  else if (e.decroche) lignes.push('⚠️ Décrochage !');
  else lignes.push(e.volets ? 'En vol · Volets sortis' : 'En vol');

  // En approche : on aide à préparer l'atterrissage
  if (!e.auSol && e.tangage < 0.05 && e.hauteurSol < 120 && distanceALaPiste(e.position.x, e.position.z) < 600) {
    lignes.push(e.vitesse <= CONFIG.vitesseAtterrissageMax
      ? '🛬 Vitesse d\'approche : OK'
      : `🛬 Trop vite ! (max ${kmh(CONFIG.vitesseAtterrissageMax)} km/h)`);
    const papi = lumieresPAPI(e.position.x, e.position.y - CONFIG.hauteurRoues, e.position.z);
    if (papi) {
      const blanches = papi.filter(Boolean).length;
      const avis = ['beaucoup trop bas !', 'un peu bas', 'bonne pente ✔', 'un peu haut', 'beaucoup trop haut !'][blanches];
      // Vu du pilote : la lumière la plus éloignée de la piste est à gauche
      const ampoules = [...papi].reverse().map((b) => (b ? '⚪' : '🔴')).join('');
      lignes.push(`PAPI ${ampoules} ${avis}`);
    }
  }
  if (e.atterrissages > 0) lignes.push(`Atterrissages réussis : ${e.atterrissages}`);
  mettreAJourHUD(lignes);
}

// La boucle du jeu : appelée environ 60 fois par seconde
const horloge = new THREE.Clock();
function boucle() {
  const dt = Math.min(horloge.getDelta(), 0.05); // évite les gros sauts si l'onglet était caché
  avion.mettreAJour(dt);
  mettreAJourMonde(avion.etat);
  tableauDeBord();
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
boucle();
