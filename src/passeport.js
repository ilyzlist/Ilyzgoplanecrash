// ============================================================
//  LES PASSEPORTS : la couverture, la page avec la photo,
//  et le tampon d'entrée au contrôle des passeports de l'aéroport
// ============================================================
import './menu.css';
import { CONFIG } from './config.js';
import { dessinerDrapeauIlyzgo, dessinerEtoile } from './drapeaux.js';

// L'emblème sur la couverture : les 12 étoiles pour l'Europe, le drapeau rond pour ILYZGO
function embleme(passeport) {
  if (passeport.id === 'ilyzgo') return dessinerDrapeauIlyzgo(200, 200).toDataURL();
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  const g = canvas.getContext('2d');
  g.fillStyle = '#e9c46a';
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    dessinerEtoile(g, 100 + Math.cos(angle) * 70, 100 + Math.sin(angle) * 70, 13);
  }
  return canvas.toDataURL();
}

// Un numéro de passeport qui ne change pas pour un même personnage
export function numeroPasseport(passeport, perso) {
  let n = 7;
  for (const lettre of passeport.id + perso.id) n = (n * 31 + lettre.charCodeAt(0)) % 1000000;
  return `${passeport.id === 'ilyzgo' ? 'IZ' : 'EU'}${String(n).padStart(6, '0')}`;
}

// La couverture du passeport (en HTML)
export function htmlCouverture(passeport) {
  return `
    <div class="passeport-couverture" style="--couleur:${passeport.couleur}">
      <div class="pc-pays">${passeport.pays}</div>
      <img class="pc-embleme ${passeport.id}" src="${embleme(passeport)}" alt="">
      <div class="pc-titre">PASSEPORT</div>
      <div class="pc-puce"></div>
    </div>`;
}

// La page d'identité, avec la photo du personnage
export function htmlPageIdentite({ passeport, perso, portrait }) {
  const numero = numeroPasseport(passeport, perso);
  const code = passeport.id === 'ilyzgo' ? 'IZG' : 'EUR';
  const nom = perso.nom.toUpperCase();
  const bandeLisible = `P&lt;${code}${nom}&lt;&lt;PILOTE`.padEnd(60, '<').replaceAll('<', '&lt;');
  return `
    <div class="passeport-page">
      <div class="pp-entete" style="background:${passeport.couleur}">
        <span>${passeport.pays}</span><span>PASSEPORT</span>
      </div>
      <div class="pp-corps">
        <img class="pp-photo" src="${portrait}" alt="Photo de ${perso.nom}">
        <dl class="pp-infos">
          <dt>Nom</dt><dd>${nom}</dd>
          <dt>Nationalité</dt><dd>${passeport.nationalite}</dd>
          <dt>N° de passeport</dt><dd>${numero}</dd>
          <dt>Profession</dt><dd>Pilote ✈️</dd>
        </dl>
      </div>
      <div class="pp-bande">${bandeLisible}</div>
      <div class="pp-tampons"></div>
    </div>`;
}

// Le tampon d'entrée : on montre le passeport ouvert, et PAF ! le tampon rouge.
export function afficherTampon(choix) {
  const date = new Date().toLocaleDateString('fr-FR');
  const fond = document.createElement('div');
  fond.id = 'tampon';
  fond.innerHTML = `
    <div class="tampon-boite">
      <div class="tampon-titre">🛂 Contrôle des passeports</div>
      ${htmlPageIdentite(choix)}
      <div class="tampon-message">${choix.passeport.accueil}</div>
      <div class="tampon-aide">Touche l'écran ou appuie sur une touche pour continuer</div>
    </div>`;
  fond.querySelector('.pp-tampons').innerHTML = `
    <div class="tampon-rouge">
      <span>${CONFIG.nomIle}</span>
      <b>✈ ENTRÉE ✈</b>
      <span>${date}</span>
      <span>AÉROPORT INTL</span>
    </div>`;
  document.body.appendChild(fond);

  // On ferme après quelques secondes, ou quand on touche l'écran / une touche
  const fermer = () => {
    fond.remove();
    window.removeEventListener('keydown', fermer);
  };
  setTimeout(() => {
    fond.addEventListener('pointerdown', fermer);
    window.addEventListener('keydown', fermer);
  }, 600);
  setTimeout(fermer, 5000);
}
