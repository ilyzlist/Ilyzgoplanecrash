// ============================================================
//  MAIN : crée la scène, ouvre le menu, puis fait tourner le jeu
//
//  Déroulement :
//  1) Menu : on choisit son passeport, son pilote et son avion
//  2) On arrive à pied devant l'aéroport et on passe le contrôle des passeports
//  3) On monte dans son avion (E ou le bouton), on roule jusqu'à la piste et on décolle !
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import {
  creerMonde, mettreAJourMonde, distanceALaPiste, lumieresPAPI, hauteurDuSol,
  ILE, PLACE_AVION, DEPART_PIETON, AEROGARE,
} from './world.js';
import { creerAeroportEtVille, dansControlePasseport } from './batiments.js';
import { creerAvion, kmh } from './plane.js';
import { creerPieton } from './character.js';
import { ouvrirMenu } from './menu.js';
import { afficherTampon } from './passeport.js';
import { mettreAJourHUD, afficherMessage } from './ui.js';
import { installerCommandesTactiles, mettreAJourTactile, estTactile } from './touch.js';
import { prendreAction, oublierDemandes } from './controls.js';

// Les commandes pour téléphone et tablette (le clavier marche toujours aussi)
installerCommandesTactiles();

// Le moteur de rendu (ce qui dessine à l'écran). Sur téléphone, un peu moins de pixels pour aller plus vite.
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, estTactile() ? 1.5 : 2));
document.body.appendChild(renderer.domElement);

// La scène (le monde 3D) et la caméra (nos yeux)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 3000);

// Adapte l'image à la taille de l'écran.
// Sur un téléphone tenu en hauteur, on élargit le champ de vision.
function adapterEcran() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 1 ? 90 : 65;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
adapterEcran();
window.addEventListener('resize', adapterEcran);

creerMonde(scene);
creerAeroportEtVille(scene);

// ---------- La flèche jaune qui montre où aller ----------
const fleche = new THREE.Mesh(
  new THREE.ConeGeometry(1.2, 2.6, 4),
  new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0xffbe0b, emissiveIntensity: 0.6 })
);
fleche.rotation.x = Math.PI; // la pointe vers le bas
fleche.visible = false;
scene.add(fleche);

// ---------- La partie ----------
let partie = null; // { choix, avion, pieton, mode: 'pieton' ou 'avion', passeportControle }

ouvrirMenu().then(demarrerPartie);

// Pour les tests (seulement avec "npm run dev") : on peut regarder la partie dans la console
if (import.meta.env.DEV) window.jeu = { get partie() { return partie; } };

function demarrerPartie(choix) {
  const avion = creerAvion(scene, choix.avion, PLACE_AVION);
  const pieton = creerPieton(scene, choix.perso);
  pieton.placer(DEPART_PIETON.x, DEPART_PIETON.z, DEPART_PIETON.angle);
  partie = { choix, avion, pieton, mode: 'pieton', passeportControle: false };
  oublierDemandes();

  // La caméra se place directement derrière le personnage
  camera.position.set(
    DEPART_PIETON.x + Math.sin(DEPART_PIETON.angle) * CONFIG.cameraPietonDistance,
    hauteurDuSol(DEPART_PIETON.x, DEPART_PIETON.z) + CONFIG.cameraPietonHauteur,
    DEPART_PIETON.z + Math.cos(DEPART_PIETON.angle) * CONFIG.cameraPietonDistance
  );
  afficherMessage(`Bienvenue ${choix.perso.nom} ! Entre dans l'aérogare et passe le contrôle des passeports 🛂`, 6);

  // Sur un téléphone tenu en hauteur, on conseille de le tourner
  setTimeout(() => {
    if (estTactile() && window.innerHeight > window.innerWidth) {
      afficherMessage('📱 Astuce : tourne ton téléphone pour mieux voir', 4);
    }
  }, 9000);
}

// Monter dans l'avion
function embarquer() {
  const { avion, pieton, choix } = partie;
  partie.mode = 'avion';
  pieton.montrer(false);
  oublierDemandes();
  afficherMessage(estTactile()
    ? `${choix.perso.nom} est aux commandes d'${avion.etat.nom} ! Roule jusqu'à la piste, monte les gaz et tire le manche`
    : `${choix.perso.nom} est aux commandes d'${avion.etat.nom} ! Roule jusqu'à la piste, gaz à 9 puis ↓ pour décoller`, 6);
}

// Descendre de l'avion
function debarquer() {
  const { avion, pieton } = partie;
  const point = avion.pointEmbarquement();
  // Le personnage regarde vers l'extérieur de l'avion
  pieton.placer(point.x, point.z, avion.etat.cap + Math.PI / 2);
  pieton.montrer(true);
  partie.mode = 'pieton';
  oublierDemandes();
  afficherMessage(`${partie.choix.perso.nom} descend de l'avion 🚶`, 2);
}

// Le personnage est-il assez près de la porte de l'avion ?
function presDeLaPorte() {
  const { avion, pieton } = partie;
  const point = avion.pointEmbarquement();
  const p = pieton.etat.position;
  return avion.estArrete() && Math.hypot(p.x - point.x, p.z - point.z) < CONFIG.distanceEmbarquement;
}

// L'objectif du moment, et l'endroit où pointe la flèche
function objectif() {
  if (!partie.passeportControle) {
    return {
      texte: 'Passe le contrôle des passeports 🛂 (au milieu de l\'aérogare)',
      cible: new THREE.Vector3(188, hauteurDuSol(188, -540) + 7, (AEROGARE.passageZ0 + AEROGARE.passageZ1) / 2),
    };
  }
  const point = partie.avion.pointEmbarquement();
  return {
    texte: `Monte dans ton avion ✈️ (va jusqu'à la flèche)`,
    cible: new THREE.Vector3(point.x, hauteurDuSol(point.x, point.z) + 4, point.z),
  };
}

// ---------- Le tableau de bord en haut à gauche ----------
function tableauDeBord(but) {
  const { choix, avion, mode } = partie;
  const lignes = [];
  if (mode === 'pieton') {
    lignes.push(`<b>👦 ${choix.perso.nom}</b>`);
    lignes.push(`🛂 ${choix.passeport.nom}${partie.passeportControle ? ' ✔' : ''}`);
    if (but) lignes.push(`🎯 ${but.texte}`);
  } else {
    const e = avion.etat;
    const crans = Math.round(e.gaz * 10);
    lignes.push(`<b>✈️ ${e.nom}</b>`);
    lignes.push(`Pilote : ${choix.perso.nom}`);
    lignes.push(`Vitesse : ${kmh(e.vitesse)} km/h`);
    lignes.push(`Altitude : ${Math.max(0, Math.round(e.hauteurSol))} m`);
    lignes.push(`Gaz : ${'█'.repeat(crans)}${'░'.repeat(10 - crans)} ${Math.round(e.gaz * 100)}%`);
    if (e.auSol) lignes.push(e.freins ? 'Au sol · 🛑 Freins' : 'Au sol');
    else if (e.decroche) lignes.push('⚠️ Décrochage !');
    else lignes.push(e.volets ? 'En vol · Volets sortis' : 'En vol');

    // En approche : on aide à préparer l'atterrissage
    if (!e.auSol && e.tangage < 0.05 && e.hauteurSol < 120 && distanceALaPiste(e.position.x, e.position.z) < 600) {
      lignes.push(e.vitesse <= e.vitesseAtterrissageMax
        ? '🛬 Vitesse d\'approche : OK'
        : `🛬 Trop vite ! (max ${kmh(e.vitesseAtterrissageMax)} km/h)`);
      const papi = lumieresPAPI(e.position.x, e.position.y - e.hauteurRoues, e.position.z);
      if (papi) {
        const blanches = papi.filter(Boolean).length;
        const avis = ['beaucoup trop bas !', 'un peu bas', 'bonne pente ✔', 'un peu haut', 'beaucoup trop haut !'][blanches];
        const ampoules = [...papi].reverse().map((b) => (b ? '⚪' : '🔴')).join('');
        lignes.push(`PAPI ${ampoules} ${avis}`);
      }
    }
    if (e.atterrissages > 0) lignes.push(`Atterrissages réussis : ${e.atterrissages}`);
  }
  mettreAJourHUD(lignes);
}

// ---------- La boucle du jeu : appelée environ 60 fois par seconde ----------
const horloge = new THREE.Clock();
let temps = 0;
function boucle() {
  const dt = Math.min(horloge.getDelta(), 0.05); // évite les gros sauts si l'onglet était caché
  temps += dt;

  if (!partie) {
    // Pendant le menu : la caméra tourne lentement autour de l'île
    const angle = temps * 0.06;
    camera.position.set(ILE.x + Math.cos(angle) * 650, 240, ILE.z + Math.sin(angle) * 650);
    camera.lookAt(ILE.x, 20, ILE.z);
  } else {
    const { avion, pieton } = partie;
    const pilote = partie.mode === 'avion';
    avion.mettreAJour(dt, pilote);
    let action = null; // le texte du bouton MONTER / DESCENDRE (ou null)
    let but = null;

    if (pilote) {
      avion.suivreCamera(camera, dt);
      if (avion.estArrete()) action = estTactile() ? '🚶 DESCENDRE' : '🚶 Descendre (E)';
      if (prendreAction()) {
        if (avion.estArrete()) debarquer();
        else afficherMessage('Pour descendre, il faut d\'abord atterrir et s\'arrêter !', 3);
      }
    } else {
      pieton.mettreAJour(dt);
      pieton.suivreCamera(camera, dt);
      const p = pieton.etat.position;

      // Le contrôle des passeports : PAF, le tampon !
      if (!partie.passeportControle && dansControlePasseport(p.x, p.z)) {
        partie.passeportControle = true;
        afficherTampon({ ...partie.choix, portrait: partie.choix.portrait });
      }

      but = objectif();
      const pres = presDeLaPorte();
      if (pres && partie.passeportControle) action = estTactile() ? '✈️ MONTER' : '✈️ Monter (E)';
      if (prendreAction()) {
        if (!pres) afficherMessage('Approche-toi de la porte de ton avion pour monter (suis la flèche jaune)', 3);
        else if (!partie.passeportControle) afficherMessage('Il faut d\'abord passer le contrôle des passeports 🛂 !', 3);
        else embarquer();
      }
    }

    // La flèche jaune flotte au-dessus de l'objectif (seulement à pied)
    fleche.visible = !!but;
    if (but) {
      fleche.position.copy(but.cible);
      fleche.position.y += Math.sin(temps * 3) * 0.8;
      fleche.rotation.y = temps * 1.5;
    }

    mettreAJourMonde(avion.etat);
    tableauDeBord(but);
    mettreAJourTactile({ mode: partie.mode, etatAvion: avion.etat, action });
  }

  renderer.render(scene, camera);
  requestAnimationFrame(boucle);
}
boucle();
