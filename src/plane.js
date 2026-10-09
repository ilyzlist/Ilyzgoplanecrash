// ============================================================
//  L'AVION : son modèle, ses contrôles et la caméra qui le suit
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { hauteurDuSol } from './world.js';

// --- Les touches du clavier ---
const touches = {};
window.addEventListener('keydown', (e) => {
  touches[e.code] = true;
  // Empêche les flèches et Espace de faire défiler la page
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { touches[e.code] = false; });

// --- Fabrique le modèle 3D de l'avion avec des formes simples ---
function creerModele() {
  const avion = new THREE.Group();
  const matCorps = new THREE.MeshStandardMaterial({ color: CONFIG.couleurAvion, flatShading: true });
  const matAiles = new THREE.MeshStandardMaterial({ color: CONFIG.couleurAilesAvion, flatShading: true });

  // Le corps (un cylindre couché). L'avant de l'avion pointe vers -Z.
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 6, 8), matCorps);
  corps.rotation.x = Math.PI / 2;
  avion.add(corps);

  // Le nez (un cône)
  const nez = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.5, 8), matCorps);
  nez.rotation.x = -Math.PI / 2;
  nez.position.z = -3.7;
  avion.add(nez);

  // Les ailes
  const ailes = new THREE.Mesh(new THREE.BoxGeometry(9, 0.2, 1.8), matAiles);
  ailes.position.z = -0.5;
  avion.add(ailes);

  // La queue : petite aile arrière + dérive verticale
  const aileron = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.15, 1), matAiles);
  aileron.position.z = 2.6;
  avion.add(aileron);
  const derive = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.6, 1), matCorps);
  derive.position.set(0, 0.8, 2.6);
  avion.add(derive);

  // L'hélice (on la fera tourner)
  const helice = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 0.1), matAiles);
  helice.position.z = -4.5;
  avion.add(helice);
  avion.userData.helice = helice;

  return avion;
}

export function creerAvion(scene, camera) {
  const modele = creerModele();
  scene.add(modele);

  // L'état de l'avion
  const etat = {
    position: new THREE.Vector3(0, CONFIG.altitudeDepart, 200),
    cap: 0,          // direction gauche/droite (en radians)
    tangage: 0,      // nez vers le haut (+) ou vers le bas (-)
    inclinaison: 0,  // penche dans les virages (juste pour faire joli)
    vitesse: CONFIG.vitesseNormale,
  };

  // Appelé à chaque image. dt = temps écoulé depuis l'image précédente (en secondes)
  function mettreAJour(dt) {
    // 1) Tourner à gauche / à droite
    let virage = 0;
    if (touches.ArrowLeft) virage += 1;
    if (touches.ArrowRight) virage -= 1;
    etat.cap += virage * CONFIG.vitesseVirage * dt;

    // L'avion penche doucement dans le virage
    const inclinaisonVoulue = virage * CONFIG.inclinaisonMax;
    etat.inclinaison += (inclinaisonVoulue - etat.inclinaison) * Math.min(1, dt * 4);

    // 2) Piquer (flèche haut) / cabrer (flèche bas), comme un vrai manche
    let monter = 0;
    if (touches.ArrowDown) monter += 1;
    if (touches.ArrowUp) monter -= 1;
    etat.tangage += monter * CONFIG.vitesseTangage * dt;
    // Si on ne touche à rien, l'avion revient doucement à l'horizontale
    if (monter === 0) etat.tangage -= etat.tangage * Math.min(1, dt * 1.5);
    // On limite pour ne pas faire de looping
    etat.tangage = THREE.MathUtils.clamp(etat.tangage, -0.9, 0.9);

    // 3) Accélérer (Espace) / ralentir (Shift)
    let vitesseVoulue = CONFIG.vitesseNormale;
    if (touches.Space) vitesseVoulue = CONFIG.vitesseMax;
    if (touches.ShiftLeft || touches.ShiftRight) vitesseVoulue = CONFIG.vitesseMin;
    const diff = vitesseVoulue - etat.vitesse;
    etat.vitesse += Math.sign(diff) * Math.min(Math.abs(diff), CONFIG.acceleration * dt);

    // 4) Avancer dans la direction où pointe le nez
    const direction = new THREE.Vector3(
      -Math.sin(etat.cap) * Math.cos(etat.tangage),
      Math.sin(etat.tangage),
      -Math.cos(etat.cap) * Math.cos(etat.tangage)
    );
    etat.position.addScaledVector(direction, etat.vitesse * dt);

    // 5) Rebond : si l'avion touche le sol ou l'eau, il remonte doucement
    const sol = hauteurDuSol(etat.position.x, etat.position.z) + CONFIG.hauteurRebond;
    if (etat.position.y < sol) {
      etat.position.y = sol;
      etat.tangage = 0.35; // petit coup vers le haut
    }

    // 6) On place le modèle 3D
    modele.position.copy(etat.position);
    modele.rotation.set(etat.tangage, etat.cap, etat.inclinaison, 'YXZ');
    modele.userData.helice.rotation.z += dt * 30;

    // 7) La caméra suit derrière et au-dessus de l'avion
    const derriere = new THREE.Vector3(
      Math.sin(etat.cap) * CONFIG.cameraDistance,
      CONFIG.cameraHauteur,
      Math.cos(etat.cap) * CONFIG.cameraDistance
    );
    const cible = etat.position.clone().add(derriere);
    camera.position.lerp(cible, Math.min(1, dt * CONFIG.cameraSouplesse));
    camera.lookAt(etat.position);
  }

  // Place la caméra directement derrière l'avion au départ
  camera.position.set(etat.position.x, etat.position.y + CONFIG.cameraHauteur, etat.position.z + CONFIG.cameraDistance);

  return { etat, mettreAJour };
}
