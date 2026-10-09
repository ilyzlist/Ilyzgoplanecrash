// ============================================================
//  L'INTERFACE : le tableau de bord (HUD) et les messages
// ============================================================

const hud = document.getElementById('hud');
const zoneMessage = document.getElementById('message');
let minuterie = null;

// Affiche un message au milieu de l'écran pendant quelques secondes
export function afficherMessage(texte, secondes = 3) {
  zoneMessage.textContent = texte;
  zoneMessage.classList.add('visible');
  clearTimeout(minuterie);
  minuterie = setTimeout(() => zoneMessage.classList.remove('visible'), secondes * 1000);
}

// Écrit les lignes du tableau de bord en haut à gauche
export function mettreAJourHUD(lignes) {
  hud.innerHTML = lignes.join('<br>');
}
