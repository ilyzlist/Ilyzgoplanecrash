// ============================================================
//  LES COMMANDES TACTILES (téléphone et tablette)
//  - le manche à gauche : on le pousse pour piquer, on le tire pour monter,
//    à gauche / à droite pour pencher l'avion
//  - la manette des gaz à droite : on la glisse vers le haut pour accélérer
//  - le bouton FREIN : freins au sol, volets en vol
//  Le clavier marche toujours en même temps.
// ============================================================

// Ce que le joueur fait avec ses doigts (lu par plane.js à chaque image)
export const tactile = {
  virage: 0,   // -1 (droite) à +1 (gauche)
  monter: 0,   // -1 (piquer) à +1 (monter)
  freins: false,
  gaz: null,   // un nombre entre 0 et 1 quand on touche la manette, sinon null
};

// Est-ce qu'on joue avec un écran tactile ?
export function estTactile() {
  return document.body.classList.contains('tactile');
}

function activerTactile() {
  document.body.classList.add('tactile');
}

// Au milieu du manche, une petite zone où il ne se passe rien (pour ne pas bouger sans le vouloir)
function zoneMorte(v) {
  const mort = 0.15;
  if (Math.abs(v) < mort) return 0;
  return Math.sign(v) * (Math.abs(v) - mort) / (1 - mort);
}

// Fait suivre un doigt sur un élément : debut / bouger / fin
function suivreDoigt(element, { bouger, fin }) {
  let doigt = null;
  element.addEventListener('pointerdown', (e) => {
    doigt = e.pointerId;
    // Le doigt reste "accroché" à la commande même s'il en sort un peu
    try { element.setPointerCapture(e.pointerId); } catch { /* pas grave */ }
    bouger(e);
    e.preventDefault();
  });
  element.addEventListener('pointermove', (e) => {
    if (e.pointerId === doigt) bouger(e);
  });
  const lacher = (e) => {
    if (e.pointerId !== doigt) return;
    doigt = null;
    fin();
  };
  element.addEventListener('pointerup', lacher);
  element.addEventListener('pointercancel', lacher);
}

export function installerCommandesTactiles() {
  // On affiche les commandes si l'écran est tactile (ou dès qu'on touche l'écran)
  const ecranTactile = window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && window.matchMedia('(hover: none)').matches);
  if (ecranTactile) activerTactile();
  window.addEventListener('touchstart', activerTactile, { once: true });

  // Empêche le zoom avec deux doigts sur iPhone / iPad
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  // --- Le manche ---
  const manche = document.getElementById('manche');
  const bouton = document.getElementById('manche-bouton');
  suivreDoigt(manche, {
    bouger(e) {
      const r = manche.getBoundingClientRect();
      const rayon = r.width / 2;
      let dx = (e.clientX - (r.left + rayon)) / rayon;
      let dy = (e.clientY - (r.top + rayon)) / rayon;
      const distance = Math.hypot(dx, dy);
      if (distance > 1) { dx /= distance; dy /= distance; }
      bouton.style.transform = `translate(calc(-50% + ${dx * rayon * 0.65}px), calc(-50% + ${dy * rayon * 0.65}px))`;
      tactile.virage = zoneMorte(-dx); // vers la gauche = tourner à gauche
      tactile.monter = zoneMorte(dy);  // vers le bas = tirer = monter
    },
    fin() {
      bouton.style.transform = '';
      tactile.virage = 0;
      tactile.monter = 0;
    },
  });

  // --- La manette des gaz ---
  const manette = document.getElementById('manette');
  suivreDoigt(manette, {
    bouger(e) {
      const r = manette.getBoundingClientRect();
      const valeur = 1 - (e.clientY - r.top) / r.height;
      tactile.gaz = Math.min(1, Math.max(0, valeur));
    },
    fin() {},
  });

  // --- Le bouton frein ---
  const frein = document.getElementById('bouton-frein');
  suivreDoigt(frein, {
    bouger() { tactile.freins = true; },
    fin() { tactile.freins = false; },
  });

  // --- Le bouton plein écran ---
  const pleinEcran = document.getElementById('plein-ecran');
  const peutPleinEcran = document.documentElement.requestFullscreen;
  if (!peutPleinEcran) pleinEcran.style.visibility = 'hidden'; // pas possible sur iPhone
  pleinEcran.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
}

// Met à jour l'affichage des commandes (position de la manette, nom du bouton)
const elements = {};
export function mettreAJourTactile(etat) {
  if (!estTactile()) return;
  elements.remplissage ??= document.getElementById('manette-remplissage');
  elements.poignee ??= document.getElementById('manette-poignee');
  elements.texte ??= document.getElementById('manette-texte');
  elements.frein ??= document.getElementById('bouton-frein');

  const pourcent = Math.round(etat.gaz * 100);
  elements.remplissage.style.height = `${pourcent}%`;
  elements.poignee.style.bottom = `calc(${etat.gaz} * (100% - 22px))`;
  elements.texte.textContent = `Gaz ${pourcent}%`;
  elements.frein.textContent = etat.auSol ? 'FREIN' : 'VOLETS';
  elements.frein.classList.toggle('actif', tactile.freins);
}
