// ============================================================
//  LES HABITANTS : les personnages qu'on n'a pas choisis
//  se promènent sur l'île (en ville, sur la place du monument,
//  dans la cour de l'école, au village et dans la clairière de la forêt).
// ============================================================
import * as THREE from 'three';
import { CONFIG, PERSONNAGES } from './config.js';
import { hauteurDuSol, hauteurDesObstacles, VILLE, VILLAGE, MONUMENT, ECOLE, FORET } from './world.js';
import { creerFigurine, animerMarche } from './character.js';

// Les endroits où les habitants aiment se promener
const COINS = [
  { nom: 'la ville', x: VILLE.x, z: VILLE.z, rayon: 60 },
  { nom: 'le monument', x: MONUMENT.x, z: MONUMENT.z, rayon: 18 },
  { nom: "l'école", x: (ECOLE.x0 + ECOLE.x1) / 2 - 6, z: -305, rayon: 20 },
  { nom: 'le village', x: VILLAGE.x, z: VILLAGE.z, rayon: 70 },
  { nom: 'la forêt', x: FORET.x, z: FORET.z + 6, rayon: 18 },
];

// Une étiquette avec le prénom, qui flotte au-dessus de la tête
function etiquette(nom) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgba(0, 0, 0, 0.5)';
  g.beginPath();
  g.roundRect(8, 6, 240, 52, 26);
  g.fill();
  g.fillStyle = '#ffffff';
  g.font = 'bold 34px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(nom, 128, 33);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.scale.set(2.4, 0.6, 1);
  sprite.position.y = 3.1;
  return sprite;
}

// Un point au hasard dans un coin
function pointAuHasard(coin) {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * coin.rayon;
  return { x: coin.x + Math.cos(angle) * r, z: coin.z + Math.sin(angle) * r };
}

// Crée les habitants (tous les personnages sauf celui qu'on joue)
export function creerHabitants(scene, persoJoueur) {
  const habitants = PERSONNAGES
    .filter((perso) => perso.id !== persoJoueur.id)
    .map((perso, i) => {
      const modele = creerFigurine(perso);
      modele.add(etiquette(perso.nom));
      const coin = COINS[i % COINS.length];
      const depart = pointAuHasard(coin);
      modele.position.set(depart.x, hauteurDuSol(depart.x, depart.z), depart.z);
      scene.add(modele);
      return { perso, modele, coin, cible: pointAuHasard(coin), attente: Math.random() * 3, pas: 0 };
    });

  // Appelé à chaque image : chacun marche vers un point, s'arrête un peu, puis repart
  function mettreAJour(dt) {
    for (const h of habitants) {
      const p = h.modele.position;
      if (h.attente > 0) {
        h.attente -= dt;
        animerMarche(h.modele, 0, 0);
        continue;
      }
      const dx = h.cible.x - p.x;
      const dz = h.cible.z - p.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 1) {
        // Arrivé ! On se repose un peu, puis on choisit un nouvel endroit
        h.attente = 1 + Math.random() * 4;
        h.cible = pointAuHasard(h.coin);
        continue;
      }
      const angle = Math.atan2(-dx, -dz); // l'avant de la figurine regarde vers -z
      const pas = Math.min(CONFIG.vitesseHabitants * dt, distance);
      const x = p.x + (dx / distance) * pas;
      const z = p.z + (dz / distance) * pas;
      const sol = hauteurDuSol(x, z);
      if (sol < 0.3 || hauteurDesObstacles(x, z) > sol + 1) {
        h.cible = pointAuHasard(h.coin); // c'est bloqué : on va ailleurs
        continue;
      }
      p.set(x, sol, z);
      h.modele.rotation.y = angle;
      h.pas += pas * 2.2;
      animerMarche(h.modele, h.pas, 0.5);
    }
  }

  return { habitants, mettreAJour };
}
