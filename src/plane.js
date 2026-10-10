// ============================================================
//  LE VOL DE L'AVION : décollage, vol, atterrissage, roulage
//  (les modèles 3D sont dans modeles-avions.js)
//
//  Un avion sans pilote ne peut pas décoller : il reste garé, freins serrés.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { hauteurDuSol, hauteurDesObstacles, surLaPiste } from './world.js';
import { afficherMessage } from './ui.js';
import { estTactile } from './touch.js';
import { creerModeleAvion, animerModele } from './modeles-avions.js';
import {
  lireVirage, lireMonter, plusDeGaz, moinsDeGaz, freinsAppuyes, prendreGazDemande,
} from './controls.js';

// Une ombre ronde sous l'avion : très utile pour savoir à quelle hauteur on est !
function creerOmbre() {
  return new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
  );
}

// def = l'avion choisi (une ligne de AVIONS dans config.js)
// place = { x, z, cap } : où l'avion est garé au début
export function creerAvion(scene, def, place) {
  const modele = creerModeleAvion(def);
  const ombre = creerOmbre();
  scene.add(modele, ombre);
  const R = { ...CONFIG, ...def }; // les réglages de CET avion

  // L'état de l'avion
  const etat = {
    nom: def.nom,
    position: new THREE.Vector3(),
    cap: place.cap,   // direction gauche/droite (en radians)
    tangage: 0,       // nez vers le haut (+) ou vers le bas (-)
    inclinaison: 0,   // l'avion penche à gauche (+) ou à droite (-)
    vitesse: 0,
    gaz: 0,           // puissance du moteur : 0 = coupé, 1 = à fond
    auSol: true,
    decroche: false,
    volets: false,    // volets sortis (F en vol)
    freins: true,     // freins serrés (F au sol)
    hauteurSol: 0,    // hauteur des roues au-dessus du sol
    hauteurRoues: modele.userData.hauteurRoues,
    atterrissages: 0, // nombre d'atterrissages réussis
    vitesseAtterrissageMax: def.vitesseAtterrissageMax,
  };
  etat.position.set(place.x, hauteurDuSol(place.x, place.z) + etat.hauteurRoues, place.z);
  let temps = 0;

  // Les commandes de cette image (pour faire bouger les gouvernes)
  let virage = 0;
  let monter = 0;

  // ---------- En vol ----------
  function volerEnLAir(dt) {
    etat.freins = false;
    etat.volets = freinsAppuyes();

    // 1) Pencher avec ← / → . Plus l'avion penche, plus il tourne (comme un vrai !)
    virage = lireVirage();
    if (virage !== 0) etat.inclinaison += virage * R.vitesseRoulis * dt;
    else etat.inclinaison -= etat.inclinaison * Math.min(1, dt * R.retourHorizontal);
    etat.inclinaison = THREE.MathUtils.clamp(etat.inclinaison, -R.inclinaisonMax, R.inclinaisonMax);
    etat.cap += Math.sin(etat.inclinaison) * R.vitesseVirage * dt;

    // 2) Piquer (↑) / cabrer (↓), comme un vrai manche
    monter = lireMonter();
    etat.tangage += monter * R.vitesseTangage * dt;
    if (monter === 0) etat.tangage -= etat.tangage * Math.min(1, dt * R.retourHorizontal);

    // 3) Décrochage : trop lent, les ailes ne portent plus, le nez tombe
    const decroche = etat.vitesse < R.vitesseDecrochage;
    if (decroche && !etat.decroche) afficherMessage('Décrochage ! Remets des gaz et pique du nez', 3);
    etat.decroche = decroche;
    if (decroche) etat.tangage -= 0.8 * dt;
    etat.tangage = THREE.MathUtils.clamp(etat.tangage, -0.8, 0.8);

    // 4) La vitesse : les gaz poussent, la gravité freine en montée et accélère en piqué
    const vitesseGaz = R.vitesseMin + etat.gaz * (R.vitesseMax - R.vitesseMin);
    etat.vitesse += (vitesseGaz - etat.vitesse) * Math.min(1, dt * R.reactiviteMoteur);
    etat.vitesse -= Math.sin(etat.tangage) * R.gravite * dt;
    if (etat.volets) etat.vitesse -= R.aerofreins * dt;
    etat.vitesse = THREE.MathUtils.clamp(etat.vitesse, 8, R.vitesseMax * 1.25);

    // 5) Avancer dans la direction où pointe le nez
    const sens = new THREE.Vector3(
      -Math.sin(etat.cap) * Math.cos(etat.tangage),
      Math.sin(etat.tangage),
      -Math.cos(etat.cap) * Math.cos(etat.tangage)
    );
    etat.position.addScaledVector(sens, etat.vitesse * dt);

    // 6) La portance : si l'avion est lent, les ailes le portent moins et il descend doucement.
    if (etat.vitesse < R.vitesseDePalier) {
      etat.position.y -= (R.vitesseDePalier - etat.vitesse) * R.descente * dt;
    }

    // 7) Toucher le sol : atterrissage sur la piste, ou rebond ailleurs
    const { x, z } = etat.position;
    const sol = Math.max(hauteurDuSol(x, z), 0); // 0 = la surface de la mer
    if (etat.position.y - etat.hauteurRoues <= sol) {
      if (surLaPiste(x, z)) {
        const assezLent = etat.vitesse <= R.vitesseAtterrissageMax;
        const aPlat = etat.tangage > -0.25 && Math.abs(etat.inclinaison) < 0.35;
        if (assezLent && aPlat) {
          etat.position.y = sol + etat.hauteurRoues;
          etat.auSol = true;
          etat.tangage = 0;
          etat.inclinaison = 0;
          etat.decroche = false;
          etat.atterrissages++;
          afficherMessage(estTactile()
            ? 'Bravo, atterrissage réussi ! 🛬  Baisse les gaz et appuie sur FREIN'
            : 'Bravo, atterrissage réussi ! 🛬  Coupe les gaz (0) et freine avec F', 4);
          return;
        }
        afficherMessage(assezLent
          ? 'Trop penché ! Arrive bien à plat sur la piste.'
          : `Trop vite pour atterrir ! (max ${kmh(R.vitesseAtterrissageMax)} km/h) Réduis les gaz.`, 3);
      }
      // Rebond doux vers le haut (l'avion ne peut pas s'écraser)
      etat.position.y = sol + etat.hauteurRoues;
      etat.tangage = 0.3;
    }

    // 8) Les maisons et les bâtiments : on rebondit par-dessus
    const obstacle = hauteurDesObstacles(x, z);
    if (obstacle > 0 && etat.position.y - etat.hauteurRoues < obstacle) {
      etat.position.y = obstacle + etat.hauteurRoues;
      etat.tangage = 0.3;
    }
  }

  // ---------- Au sol ----------
  function roulerAuSol(dt, pilote) {
    // L'avion reste à plat
    etat.tangage = 0;
    etat.inclinaison = 0;
    etat.decroche = false;
    etat.volets = false;
    // Sans pilote : freins de parking serrés
    etat.freins = pilote ? freinsAppuyes() : true;

    // Tourner avec ← / → (seulement si on roule)
    virage = pilote ? lireVirage() : 0;
    monter = pilote ? Math.max(lireMonter(), 0) : 0;
    etat.cap += virage * R.vitesseVirageSol * dt * Math.min(1, etat.vitesse / 8);

    // La vitesse : les gaz poussent, les roues freinent un peu, F freine fort
    const vitesseGaz = etat.gaz * R.vitesseMax;
    etat.vitesse += (vitesseGaz - etat.vitesse) * Math.min(1, dt * R.reactiviteMoteur * 0.5);
    if (etat.freins) etat.vitesse -= R.freinage * dt;
    etat.vitesse = Math.max(etat.vitesse, 0);

    // Avancer, sauf si on arrive dans l'eau ou contre un bâtiment
    const x = etat.position.x - Math.sin(etat.cap) * etat.vitesse * dt;
    const z = etat.position.z - Math.cos(etat.cap) * etat.vitesse * dt;
    const sol = hauteurDuSol(x, z);
    if (sol < 0.5 || hauteurDesObstacles(x, z) > sol + 1) {
      if (etat.vitesse > 0.5) afficherMessage('Stop ! Fais demi-tour', 2);
      etat.vitesse = 0;
    } else {
      etat.position.set(x, sol + etat.hauteurRoues, z);
    }

    // Décoller : tirer sur le manche (↓) quand on va assez vite
    if (monter > 0.5) {
      if (etat.vitesse >= R.vitesseDecollage) {
        etat.auSol = false;
        etat.tangage = 0.12;
        etat.position.y += 0.5;
        afficherMessage('Décollage ! ✈️', 2);
      } else {
        afficherMessage(`Pas assez de vitesse pour décoller (il faut ${kmh(R.vitesseDecollage)} km/h) : mets les gaz !`, 2);
      }
    }
  }

  // Appelé à chaque image. dt = temps écoulé (en secondes). pilote = quelqu'un est à bord ?
  function mettreAJour(dt, pilote) {
    temps += dt;

    // Les gaz : seulement si un pilote est à bord
    if (pilote) {
      const gazDemande = prendreGazDemande();
      if (gazDemande !== null) etat.gaz = gazDemande;
      if (plusDeGaz()) etat.gaz += R.vitesseManette * dt;
      if (moinsDeGaz()) etat.gaz -= R.vitesseManette * dt;
      etat.gaz = THREE.MathUtils.clamp(etat.gaz, 0, 1);
    } else {
      etat.gaz = 0;
    }

    if (etat.auSol) roulerAuSol(dt, pilote);
    else volerEnLAir(dt);

    const { x, z } = etat.position;
    const sol = Math.max(hauteurDuSol(x, z), 0);
    etat.hauteurSol = etat.position.y - etat.hauteurRoues - sol;

    // On place le modèle 3D et on fait bouger ses pièces
    modele.position.copy(etat.position);
    modele.rotation.set(etat.tangage, etat.cap, etat.inclinaison, 'YXZ');
    const gare = etat.auSol && etat.vitesse < 0.5 && etat.gaz < 0.05;
    animerModele(modele, { gaz: etat.gaz, virage, monter, volets: etat.volets, temps, gare }, dt);

    // L'ombre : sur le sol, plus petite et plus pâle quand on monte
    const loin = Math.min(etat.hauteurSol / 150, 1);
    ombre.position.set(x, sol + 0.2, z);
    ombre.rotation.set(-Math.PI / 2, 0, etat.cap);
    const reduction = 1 - loin * 0.5;
    ombre.scale.set(modele.userData.envergure * 0.45 * reduction, modele.userData.longueur * 0.45 * reduction, 1);
    ombre.material.opacity = 0.35 * (1 - loin * 0.8);
  }

  // La caméra suit derrière et au-dessus de l'avion
  function suivreCamera(camera, dt) {
    const derriere = new THREE.Vector3(
      Math.sin(etat.cap) * R.cameraDistance,
      R.cameraHauteur,
      Math.cos(etat.cap) * R.cameraDistance
    );
    const cible = etat.position.clone().add(derriere);
    camera.position.lerp(cible, Math.min(1, dt * R.cameraSouplesse));
    camera.lookAt(etat.position);
  }

  // L'endroit où le personnage monte dans l'avion (au pied de la porte), dans le monde
  function pointEmbarquement() {
    modele.updateMatrixWorld();
    const p = modele.userData.pointEmbarquement.clone();
    return modele.localToWorld(p);
  }

  // L'avion est-il arrêté (pour monter ou descendre) ?
  const estArrete = () => etat.auSol && etat.vitesse < 1.5;

  return { etat, modele, mettreAJour, suivreCamera, pointEmbarquement, estArrete };
}

// Convertit une vitesse du jeu en km/h (pour l'affichage)
export function kmh(vitesse) {
  return Math.round(vitesse * 3.6);
}
