// ============================================================
//  LES COMMANDES SUR L'ÉCRAN (téléphone et tablette)
//  - le manche à gauche :
//      en avion : pousser = piquer, tirer = monter, gauche / droite = pencher
//      à pied   : pousser = avancer, tirer = reculer, gauche / droite = tourner
//  - en avion : la manette des gaz à droite et le bouton FREIN (VOLETS en vol)
//  - à pied   : le bouton SAUT
//  - partout  : le bouton MONTER / DESCENDRE quand on est près de l'avion
//  Le clavier marche toujours en même temps.
// ============================================================

// Ce que le joueur fait avec ses doigts (lu par controls.js)
export const tactile = {
  virage: 0,     // -1 (droite) à +1 (gauche)
  monter: 0,     // -1 (manche poussé) à +1 (manche tiré)
  freins: false,
  gaz: null,     // un nombre entre 0 et 1 quand on touche la manette, sinon null
  action: false, // le bouton MONTER / DESCENDRE a été touché
  saut: false,   // le bouton SAUT a été touché
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

// Fait suivre un doigt sur un élément
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

// Un bouton qu'on touche une fois (et qui marche aussi à la souris)
function boutonAppui(element, quandAppuye) {
  element.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    quandAppuye();
  });
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
      tactile.monter = zoneMorte(dy);  // vers le bas = tirer
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

  // --- Les boutons SAUT et MONTER / DESCENDRE ---
  boutonAppui(document.getElementById('bouton-saut'), () => { tactile.saut = true; });
  boutonAppui(document.getElementById('bouton-action'), () => { tactile.action = true; });

  // --- Le bouton plein écran ---
  const pleinEcran = document.getElementById('plein-ecran');
  const peutPleinEcran = document.documentElement.requestFullscreen;
  if (!peutPleinEcran) pleinEcran.style.visibility = 'hidden'; // pas possible sur iPhone
  pleinEcran.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
}

// Met à jour les commandes sur l'écran selon ce qu'on fait.
// infos = { mode: 'pieton' ou 'avion', etatAvion, action: texte du bouton ou null }
const elements = {};
let dernierMode = null;
let derniereAction;
export function mettreAJourTactile(infos) {
  const $ = (id) => (elements[id] ??= document.getElementById(id));

  // Le mode change : on montre les bonnes commandes
  if (infos.mode !== dernierMode) {
    dernierMode = infos.mode;
    document.body.classList.toggle('mode-pieton', infos.mode === 'pieton');
    document.body.classList.toggle('mode-avion', infos.mode === 'avion');
    $('fleche-haut').textContent = infos.mode === 'avion' ? '▲ piquer' : '▲ avancer';
    $('fleche-bas').textContent = infos.mode === 'avion' ? '▼ monter' : '▼ reculer';
    $('etiquette-manche').textContent = infos.mode === 'avion' ? 'Manche' : 'Marcher';
  }

  // Le bouton MONTER / DESCENDRE (il marche aussi à la souris sur ordinateur)
  if (infos.action !== derniereAction) {
    derniereAction = infos.action;
    $('bouton-action').hidden = !infos.action;
    if (infos.action) $('bouton-action').textContent = infos.action;
  }

  if (!estTactile() || infos.mode !== 'avion') return;
  const etat = infos.etatAvion;
  const pourcent = Math.round(etat.gaz * 100);
  $('manette-remplissage').style.height = `${pourcent}%`;
  $('manette-poignee').style.bottom = `calc(${etat.gaz} * (100% - 22px))`;
  $('manette-texte').textContent = `Gaz ${pourcent}%`;
  $('bouton-frein').textContent = etat.auSol ? 'FREIN' : 'VOLETS';
  $('bouton-frein').classList.toggle('actif', tactile.freins);
}
