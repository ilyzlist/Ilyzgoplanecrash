// ============================================================
//  LES COMMANDES : clavier ET écran tactile, au même endroit
//
//  Dans l'avion :  ↑ ↓ piquer / cabrer · ← → pencher · 0-9 gaz · Espace / Shift gaz · F freins
//  À pied :        ↑ ↓ (ou Z / S) avancer / reculer · ← → (ou Q / D) tourner · Shift courir · Espace sauter
//  Partout :       E pour monter dans l'avion ou en descendre
// ============================================================
import { tactile } from './touch.js';

const touches = {};
let gazDemande = null;      // un chiffre a été tapé
let actionDemandee = false; // E a été tapé
let sautDemande = false;    // Espace a été tapé

window.addEventListener('keydown', (e) => {
  // Pendant qu'on choisit dans le menu, le jeu n'écoute pas le clavier
  if (document.body.classList.contains('menu-ouvert')) return;

  touches[e.code] = true;
  // Les chiffres 0 à 9 règlent les gaz : 0 = coupé, 5 = 50 %, 9 = 90 %
  const chiffre = e.code.match(/^(?:Digit|Numpad)(\d)$/);
  if (chiffre) gazDemande = Number(chiffre[1]) / 10;
  if (e.code === 'KeyE' && !e.repeat) actionDemandee = true;
  if (e.code === 'Space' && !e.repeat) sautDemande = true;
  // Empêche les flèches et Espace de faire défiler la page
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { touches[e.code] = false; });
// Si la fenêtre perd le focus, on relâche toutes les touches
window.addEventListener('blur', () => { for (const t in touches) touches[t] = false; });

const appuye = (...codes) => codes.some((c) => touches[c]);
const shift = () => appuye('ShiftLeft', 'ShiftRight');

// ---------- Dans l'avion ----------

// Tourner : de -1 (droite) à +1 (gauche)
export function lireVirage() {
  const clavier = (appuye('ArrowLeft') ? 1 : 0) - (appuye('ArrowRight') ? 1 : 0);
  return clavier !== 0 ? clavier : tactile.virage;
}

// Monter / descendre : de -1 (piquer) à +1 (cabrer)
export function lireMonter() {
  const clavier = (appuye('ArrowDown') ? 1 : 0) - (appuye('ArrowUp') ? 1 : 0);
  return clavier !== 0 ? clavier : tactile.monter;
}

export const plusDeGaz = () => appuye('Space');
export const moinsDeGaz = () => shift();
export const freinsAppuyes = () => appuye('KeyF') || tactile.freins;

// Renvoie les gaz demandés d'un coup (chiffre ou manette tactile), ou null
export function prendreGazDemande() {
  let gaz = null;
  if (gazDemande !== null) gaz = gazDemande;
  if (tactile.gaz !== null) gaz = tactile.gaz;
  gazDemande = null;
  tactile.gaz = null;
  return gaz;
}

// ---------- À pied ----------
// (KeyW / KeyA / KeyS / KeyD = les touches Z / Q / S / D sur un clavier français)

// Avancer : +1 en avant, -1 en arrière
export function lireAvancer() {
  const clavier = (appuye('ArrowUp', 'KeyW') ? 1 : 0) - (appuye('ArrowDown', 'KeyS') ? 1 : 0);
  return clavier !== 0 ? clavier : -tactile.monter;
}

// Tourner : +1 à gauche, -1 à droite
export function lireTourner() {
  const clavier = (appuye('ArrowLeft', 'KeyA') ? 1 : 0) - (appuye('ArrowRight', 'KeyD') ? 1 : 0);
  return clavier !== 0 ? clavier : tactile.virage;
}

export const courir = () => shift();

export function prendreSaut() {
  const saut = sautDemande || tactile.saut;
  sautDemande = false;
  tactile.saut = false;
  return saut;
}

// ---------- Partout ----------

// Monter dans l'avion / en descendre (E, ou le bouton sur l'écran)
export function prendreAction() {
  const action = actionDemandee || tactile.action;
  actionDemandee = false;
  tactile.action = false;
  return action;
}

// Oublie les appuis en attente (quand on change de mode)
export function oublierDemandes() {
  gazDemande = null;
  actionDemandee = false;
  sautDemande = false;
  tactile.gaz = null;
  tactile.action = false;
  tactile.saut = false;
}
