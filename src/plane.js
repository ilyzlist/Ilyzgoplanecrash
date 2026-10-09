// ============================================================
//  L'AVION : son modèle, son vol, l'atterrissage et la caméra
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { hauteurDuSol, hauteurDesObstacles, surLaPiste, PISTE } from './world.js';
import { afficherMessage } from './ui.js';

// --- Les touches du clavier ---
const touches = {};
window.addEventListener('keydown', (e) => {
  touches[e.code] = true;
  // Empêche les flèches et Espace de faire défiler la page
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { touches[e.code] = false; });

const shift = () => touches.ShiftLeft || touches.ShiftRight;

// --- Fabrique le modèle 3D de l'avion (un petit avion à aile haute) ---
// L'avant de l'avion pointe vers -Z, le haut vers +Y.
function creerModele() {
  const avion = new THREE.Group();
  const matiere = (couleur, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: couleur, flatShading: true, ...extra });
  const matCorps = matiere(CONFIG.couleurAvion);
  const matAiles = matiere(CONFIG.couleurAilesAvion);
  const matSombre = matiere(0x333333);
  const matVitre = matiere(0x9fd8ff, { metalness: 0.3, roughness: 0.1, transparent: true, opacity: 0.85 });
  const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);

  // Le fuselage : gros devant, fin vers la queue
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.8, 6, 10), matCorps);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.z = 0.6;
  avion.add(fuselage);

  // Le capot du moteur et le cône de l'hélice
  const capot = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.65, 1.2, 10), matAiles);
  capot.rotation.x = Math.PI / 2;
  capot.position.z = -3.0;
  avion.add(capot);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 10), matCorps);
  cone.rotation.x = -Math.PI / 2;
  cone.position.z = -4.0;
  avion.add(cone);

  // L'hélice (on la fera tourner selon la puissance du moteur)
  const helice = new THREE.Group();
  helice.position.z = -3.9;
  helice.add(boite(0.25, 3.4, 0.08, matSombre));
  avion.add(helice);
  avion.userData.helice = helice;

  // Le cockpit vitré
  const vitre = boite(1.2, 0.7, 1.6, matVitre);
  vitre.position.set(0, 0.7, -1.3);
  avion.add(vitre);

  // L'aile, posée au-dessus du fuselage, avec des bouts rouges
  const aile = boite(10.5, 0.18, 1.7, matAiles);
  aile.position.set(0, 1.15, -1.0);
  avion.add(aile);
  for (const cote of [-1, 1]) {
    const bout = boite(0.6, 0.2, 1.72, matCorps);
    bout.position.set(cote * 5.0, 1.15, -1.0);
    avion.add(bout);

    // Les haubans : les barres qui tiennent l'aile
    const hauban = boite(0.12, 2.33, 0.12, matSombre);
    hauban.position.set(cote * 1.65, 0.38, -0.9);
    hauban.rotation.z = -cote * 0.95;
    avion.add(hauban);
  }

  // La queue : le stabilisateur (petite aile) et la dérive (aileron vertical)
  const stabilisateur = boite(3.8, 0.12, 1.0, matAiles);
  stabilisateur.position.set(0, 0.25, 3.3);
  avion.add(stabilisateur);
  const derive = boite(0.12, 1.7, 1.2, matCorps);
  derive.position.set(0, 1.05, 3.4);
  derive.rotation.x = 0.3;
  avion.add(derive);

  // Le train d'atterrissage : deux roues sous le ventre et une roue sous le nez
  const geoRoue = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 12);
  geoRoue.rotateZ(Math.PI / 2);
  for (const cote of [-1, 1]) {
    const roue = new THREE.Mesh(geoRoue, matSombre);
    roue.position.set(cote * 1.2, -1.35, -0.6);
    const jambe = boite(0.12, 1.04, 0.12, matSombre);
    jambe.position.set(cote * 0.9, -0.93, -0.6);
    jambe.rotation.z = cote * 0.6;
    avion.add(roue, jambe);
  }
  const roueAvant = new THREE.Mesh(geoRoue, matSombre);
  roueAvant.position.set(0, -1.35, -2.9);
  const jambeAvant = boite(0.12, 0.9, 0.12, matSombre);
  jambeAvant.position.set(0, -0.95, -2.9);
  avion.add(roueAvant, jambeAvant);

  return avion;
}

// Une ombre ronde sous l'avion : très utile pour savoir à quelle hauteur on est !
function creerOmbre() {
  const ombre = new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
  );
  ombre.scale.set(5, 4, 1);
  return ombre;
}

export function creerAvion(scene, camera) {
  const modele = creerModele();
  const ombre = creerOmbre();
  scene.add(modele, ombre);

  // L'état de l'avion
  const etat = {
    position: new THREE.Vector3(),
    cap: 0,           // direction gauche/droite (en radians)
    tangage: 0,       // nez vers le haut (+) ou vers le bas (-)
    inclinaison: 0,   // l'avion penche à gauche (+) ou à droite (-)
    vitesse: 0,
    moteur: 0,        // puissance du moteur : 0 = coupé, 1 = à fond
    auSol: false,
    decroche: false,
    hauteurSol: 0,    // hauteur des roues au-dessus du sol
    atterrissages: 0, // nombre d'atterrissages réussis
  };

  // --- Le départ ---
  if (CONFIG.departSurLaPiste) {
    // Posé au bout de la piste, le nez dans l'axe
    const z = PISTE.z + PISTE.longueur / 2 - 20;
    etat.position.set(PISTE.x, hauteurDuSol(PISTE.x, z) + CONFIG.hauteurRoues, z);
    etat.auSol = true;
    afficherMessage('Mets les gaz avec Espace, puis tire sur ↓ pour décoller !', 6);
  } else {
    // En vol, face à la piste
    etat.position.set(PISTE.x, CONFIG.altitudeDepart, PISTE.z + PISTE.longueur / 2 + 400);
    etat.moteur = CONFIG.moteurDepart;
    etat.vitesse = CONFIG.vitesseMin + etat.moteur * (CONFIG.vitesseMax - CONFIG.vitesseMin);
  }

  // Remet l'avion au contact du sol (roues sur la piste)
  function poser() {
    etat.auSol = true;
    etat.tangage = 0;
    etat.inclinaison = 0;
    etat.decroche = false;
    etat.atterrissages++;
    afficherMessage('Bravo, atterrissage réussi ! 🛬  Shift pour freiner', 4);
  }

  // ---------- En vol ----------
  function volerEnLAir(dt) {
    // 1) Pencher avec ← / → . Plus l'avion penche, plus il tourne (comme un vrai !)
    const virage = (touches.ArrowLeft ? 1 : 0) - (touches.ArrowRight ? 1 : 0);
    if (virage !== 0) etat.inclinaison += virage * CONFIG.vitesseRoulis * dt;
    else etat.inclinaison -= etat.inclinaison * Math.min(1, dt * CONFIG.retourHorizontal);
    etat.inclinaison = THREE.MathUtils.clamp(etat.inclinaison, -CONFIG.inclinaisonMax, CONFIG.inclinaisonMax);
    etat.cap += Math.sin(etat.inclinaison) * CONFIG.vitesseVirage * dt;

    // 2) Piquer (↑) / cabrer (↓), comme un vrai manche
    const monter = (touches.ArrowDown ? 1 : 0) - (touches.ArrowUp ? 1 : 0);
    etat.tangage += monter * CONFIG.vitesseTangage * dt;
    if (monter === 0) etat.tangage -= etat.tangage * Math.min(1, dt * CONFIG.retourHorizontal);

    // 3) Décrochage : trop lent, les ailes ne portent plus, le nez tombe
    const decroche = etat.vitesse < CONFIG.vitesseDecrochage;
    if (decroche && !etat.decroche) afficherMessage('Décrochage ! Mets les gaz (Espace) et pique du nez (↑)', 3);
    etat.decroche = decroche;
    if (decroche) etat.tangage -= 0.8 * dt;
    etat.tangage = THREE.MathUtils.clamp(etat.tangage, -0.9, 0.9);

    // 4) La vitesse : le moteur pousse, la gravité freine en montée et accélère en piqué
    const vitesseMoteur = CONFIG.vitesseMin + etat.moteur * (CONFIG.vitesseMax - CONFIG.vitesseMin);
    etat.vitesse += (vitesseMoteur - etat.vitesse) * Math.min(1, dt * CONFIG.reactiviteMoteur);
    etat.vitesse -= Math.sin(etat.tangage) * CONFIG.gravite * dt;
    etat.vitesse = THREE.MathUtils.clamp(etat.vitesse, 8, CONFIG.vitesseMax * 1.3);

    // 5) Avancer dans la direction où pointe le nez
    const direction = new THREE.Vector3(
      -Math.sin(etat.cap) * Math.cos(etat.tangage),
      Math.sin(etat.tangage),
      -Math.cos(etat.cap) * Math.cos(etat.tangage)
    );
    etat.position.addScaledVector(direction, etat.vitesse * dt);

    // 6) La portance : si l'avion est lent, les ailes le portent moins et il descend doucement.
    //    C'est comme ça qu'on se prépare à atterrir : on réduit les gaz (Shift).
    if (etat.vitesse < CONFIG.vitesseDePalier) {
      etat.position.y -= (CONFIG.vitesseDePalier - etat.vitesse) * CONFIG.descente * dt;
    }

    // 7) Toucher le sol : atterrissage sur la piste, ou rebond ailleurs
    const { x, z } = etat.position;
    const sol = Math.max(hauteurDuSol(x, z), 0); // 0 = la surface de la mer
    if (etat.position.y - CONFIG.hauteurRoues <= sol) {
      if (surLaPiste(x, z)) {
        const assezLent = etat.vitesse <= CONFIG.vitesseAtterrissageMax;
        const aPlat = etat.tangage > -0.25 && Math.abs(etat.inclinaison) < 0.35;
        if (assezLent && aPlat) {
          etat.position.y = sol + CONFIG.hauteurRoues;
          poser();
          return;
        }
        afficherMessage(assezLent
          ? 'Trop penché ! Arrive bien à plat sur la piste.'
          : 'Trop vite pour atterrir ! Réduis les gaz avec Shift.', 3);
      }
      // Rebond doux vers le haut (l'avion ne peut pas s'écraser)
      etat.position.y = sol + CONFIG.hauteurRoues;
      etat.tangage = 0.35;
    }

    // 8) Les maisons et la tour : on rebondit par-dessus
    const obstacle = hauteurDesObstacles(x, z);
    if (obstacle > 0 && etat.position.y - CONFIG.hauteurRoues < obstacle) {
      etat.position.y = obstacle + CONFIG.hauteurRoues;
      etat.tangage = 0.35;
    }
  }

  // ---------- Au sol ----------
  function roulerAuSol(dt) {
    // L'avion reste à plat
    etat.tangage = 0;
    etat.inclinaison = 0;
    etat.decroche = false;

    // Tourner avec ← / → (seulement si on roule)
    const virage = (touches.ArrowLeft ? 1 : 0) - (touches.ArrowRight ? 1 : 0);
    etat.cap += virage * CONFIG.vitesseVirageSol * dt * Math.min(1, etat.vitesse / 10);

    // La vitesse : le moteur pousse, les roues freinent un peu, Shift freine fort
    const vitesseMoteur = etat.moteur * CONFIG.vitesseMax;
    etat.vitesse += (vitesseMoteur - etat.vitesse) * Math.min(1, dt * 0.4);
    if (shift()) etat.vitesse -= CONFIG.freinage * dt;
    etat.vitesse = Math.max(etat.vitesse, 0);

    // Avancer, sauf si on arrive dans l'eau ou contre une maison
    const x = etat.position.x - Math.sin(etat.cap) * etat.vitesse * dt;
    const z = etat.position.z - Math.cos(etat.cap) * etat.vitesse * dt;
    const sol = hauteurDuSol(x, z);
    if (sol < 0.5 || hauteurDesObstacles(x, z) > sol + 1) {
      etat.vitesse = 0;
      afficherMessage('Stop ! Fais demi-tour avec ← ou →', 2);
    } else {
      etat.position.set(x, sol + CONFIG.hauteurRoues, z);
    }

    // Décoller : tirer sur le manche (↓) quand on va assez vite
    if (touches.ArrowDown) {
      if (etat.vitesse >= CONFIG.vitesseDecollage) {
        etat.auSol = false;
        etat.tangage = 0.15;
        etat.position.y += 0.5;
        afficherMessage('Décollage ! ✈️', 2);
      } else {
        afficherMessage('Pas assez de vitesse pour décoller : mets les gaz avec Espace !', 2);
      }
    }
  }

  // Appelé à chaque image. dt = temps écoulé depuis l'image précédente (en secondes)
  function mettreAJour(dt) {
    // La manette des gaz : Espace pour augmenter, Shift pour diminuer
    if (touches.Space) etat.moteur += CONFIG.vitesseManette * dt;
    if (shift()) etat.moteur -= CONFIG.vitesseManette * dt;
    etat.moteur = THREE.MathUtils.clamp(etat.moteur, 0, 1);

    if (etat.auSol) roulerAuSol(dt);
    else volerEnLAir(dt);

    const { x, z } = etat.position;
    const sol = Math.max(hauteurDuSol(x, z), 0);
    etat.hauteurSol = etat.position.y - CONFIG.hauteurRoues - sol;

    // On place le modèle 3D
    modele.position.copy(etat.position);
    modele.rotation.set(etat.tangage, etat.cap, etat.inclinaison, 'YXZ');
    modele.userData.helice.rotation.z += dt * (5 + etat.moteur * 40);

    // L'ombre : sur le sol, plus petite et plus pâle quand on monte
    const loin = Math.min(etat.hauteurSol / 150, 1);
    ombre.position.set(x, sol + 0.2, z);
    ombre.rotation.set(-Math.PI / 2, 0, etat.cap);
    ombre.scale.set(5 * (1 - loin * 0.5), 4 * (1 - loin * 0.5), 1);
    ombre.material.opacity = 0.35 * (1 - loin * 0.8);

    // La caméra suit derrière et au-dessus de l'avion
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
