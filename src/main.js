// ============================================================
//  MAIN : crée la scène et fait tourner la boucle du jeu
// ============================================================
import * as THREE from 'three';
import { creerMonde } from './world.js';
import { creerAvion } from './plane.js';

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

// Petit affichage en haut à gauche
const hud = document.getElementById('hud');

// La boucle du jeu : appelée environ 60 fois par seconde
const horloge = new THREE.Clock();
function boucle() {
  const dt = Math.min(horloge.getDelta(), 0.05); // évite les gros sauts si l'onglet était caché
  avion.mettreAJour(dt);

  hud.textContent =
    `Vitesse : ${Math.round(avion.etat.vitesse)}  ·  Altitude : ${Math.round(avion.etat.position.y)}`;

  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
boucle();
