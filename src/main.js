// ============================================================
//  MAIN : crée la scène et fait tourner la boucle du jeu
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { creerMonde, distanceALaPiste } from './world.js';
import { creerAvion } from './plane.js';
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

// Si on change la taille de la fenêtre, on adapte l'image
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Le tableau de bord en haut à gauche
function tableauDeBord() {
  const e = avion.etat;
  const crans = Math.round(e.moteur * 10);
  const lignes = [
    `Vitesse : ${Math.round(e.vitesse)}`,
    `Altitude : ${Math.max(0, Math.round(e.hauteurSol))}`,
    `Moteur : ${'█'.repeat(crans)}${'░'.repeat(10 - crans)} ${Math.round(e.moteur * 100)}%`,
    e.auSol ? 'Au sol' : e.decroche ? '⚠️ Décrochage !' : 'En vol',
  ];
  // Près de la piste : on aide à préparer l'atterrissage
  if (!e.auSol && e.tangage < 0.05 && e.hauteurSol < 80 && distanceALaPiste(e.position.x, e.position.z) < 250) {
    lignes.push(e.vitesse <= CONFIG.vitesseAtterrissageMax
      ? '🛬 Approche : vitesse OK'
      : `🛬 Approche : trop vite ! (max ${CONFIG.vitesseAtterrissageMax}, Shift)`);
  }
  if (e.atterrissages > 0) lignes.push(`Atterrissages réussis : ${e.atterrissages}`);
  mettreAJourHUD(lignes);
}

// La boucle du jeu : appelée environ 60 fois par seconde
const horloge = new THREE.Clock();
function boucle() {
  const dt = Math.min(horloge.getDelta(), 0.05); // évite les gros sauts si l'onglet était caché
  avion.mettreAJour(dt);
  tableauDeBord();
  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
boucle();
