// ============================================================
//  CONSTRUIRE SUR L'ÎLE 🔨
//  À pied, on appuie sur B (ou le bouton 🔨) et on choisit un bâtiment.
//  Un aperçu transparent apparaît devant le personnage, avec un cercle :
//    vert = on peut construire ici · rouge = impossible (eau, pente, déjà occupé…)
//  Entrée (ou ✔ POSER) pour construire, R (ou ↻) pour tourner, Échap (ou ✖) pour arrêter.
// ============================================================
import * as THREE from 'three';
import {
  hauteurDuSol, hauteurDesObstacles, ajouterObstacle, zoneReservee,
  creerMaison, creerSapin, creerHasard, matiere,
} from './world.js';
import { panneau } from './batiments.js';
import { afficherMessage } from './ui.js';

const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);

// ---------- Un magasin (boulangerie, café, glacier…) ----------
// La porte et l'enseigne sont devant (vers +z)
function boutique({ largeur = 12, profondeur = 9, hauteur = 5.5, mur, toit = 0x555555, enseigne, fond, auvent }) {
  const g = new THREE.Group();
  const avant = profondeur / 2;
  const murs = boite(largeur, hauteur, profondeur, matiere(mur));
  murs.position.y = hauteur / 2;
  const dessus = boite(largeur + 0.6, 0.5, profondeur + 0.6, matiere(toit));
  dessus.position.y = hauteur + 0.25;
  const vitrine = boite(largeur * 0.5, 2.2, 0.1, matiere(0x9fd8ff, { metalness: 0.3, roughness: 0.2 }));
  vitrine.position.set(-largeur * 0.15, 1.9, avant + 0.06);
  const porte = boite(1.8, 2.8, 0.12, matiere(0x6b4226));
  porte.position.set(largeur * 0.3, 1.4, avant + 0.06);
  g.add(murs, dessus, vitrine, porte);
  // L'auvent rayé au-dessus de la vitrine
  if (auvent) {
    const bandes = 8;
    for (let i = 0; i < bandes; i++) {
      const bande = boite(largeur / bandes, 0.12, 1.8, matiere(auvent[i % 2]));
      bande.position.set(-largeur / 2 + (i + 0.5) * (largeur / bandes), 3.7, avant + 0.8);
      bande.rotation.x = 0.3;
      g.add(bande);
    }
  }
  // L'enseigne
  const nom = panneau(enseigne, largeur * 0.85, 1.4, { fond });
  nom.position.set(0, hauteur - 0.9, avant + 0.08);
  g.add(nom);
  return g;
}

// ---------- Les bâtiments qu'on peut construire ----------
// fabriquer(hasard) renvoie le modèle 3D. hasard() donne des nombres au hasard (pour varier les couleurs).
export const TYPES_BATIMENTS = [
  {
    id: 'maison', nom: 'Maison', emoji: '🏠',
    fabriquer: (hasard) => creerMaison(hasard),
  },
  {
    id: 'boulangerie', nom: 'Boulangerie', emoji: '🥖',
    fabriquer() {
      const g = boutique({ mur: 0xfff1d6, toit: 0x8e5a3c, enseigne: '🥖 BOULANGERIE', fond: '#8e5a3c', auvent: [0xffffff, 0xe63946] });
      // Un croissant géant sur le toit !
      const croissant = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.6, 8, 14, Math.PI * 1.2), matiere(0xe0a03a));
      croissant.position.set(0, 7.2, 0);
      croissant.rotation.z = Math.PI * 0.9;
      g.add(croissant);
      return g;
    },
  },
  {
    id: 'cafe', nom: 'Café', emoji: '☕',
    fabriquer() {
      const g = boutique({ mur: 0xe9edc9, toit: 0x2d6a4f, enseigne: '☕ CAFÉ ILYZGO', fond: '#2d6a4f', auvent: [0xffffff, 0x2d6a4f] });
      // La terrasse : des tables et des parasols
      for (const x of [-3.5, 3.5]) {
        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.1, 12), matiere(0xffffff));
        table.position.set(x, 1, 7.5);
        const pied = boite(0.1, 1, 0.1, matiere(0x333333));
        pied.position.set(x, 0.5, 7.5);
        const mat = boite(0.08, 2.6, 0.08, matiere(0x333333));
        mat.position.set(x, 1.3, 7.5);
        const parasol = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.8, 8), matiere(x < 0 ? 0xe63946 : 0xffbe0b));
        parasol.position.set(x, 2.9, 7.5);
        g.add(table, pied, mat, parasol);
      }
      return g;
    },
  },
  {
    id: 'glacier', nom: 'Glacier', emoji: '🍦',
    fabriquer() {
      const g = boutique({ largeur: 8, profondeur: 6, hauteur: 4, mur: 0xffd6e0, toit: 0xff70a6, enseigne: '🍦 GLACES', fond: '#ff70a6', auvent: [0xffffff, 0xff70a6] });
      // Un cornet de glace géant sur le toit
      const cornet = new THREE.Mesh(new THREE.ConeGeometry(1.1, 3, 12), matiere(0xe0a03a));
      cornet.rotation.x = Math.PI;
      cornet.position.y = 6;
      const boule1 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), matiere(0xff8fab));
      boule1.position.y = 8;
      const boule2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 8), matiere(0x7a4b2a));
      boule2.position.y = 9.4;
      g.add(cornet, boule1, boule2);
      return g;
    },
  },
  {
    id: 'pompiers', nom: 'Pompiers', emoji: '🚒',
    fabriquer() {
      const g = boutique({ largeur: 16, profondeur: 12, hauteur: 7, mur: 0xd62828, toit: 0x6b0f1a, enseigne: '🚒 POMPIERS', fond: '#1d3557' });
      // La grande porte du garage et la tour d'entraînement
      const garage = boite(8, 4.5, 0.15, matiere(0x8d99ae));
      garage.position.set(-2.5, 2.25, 6.1);
      const tour = boite(3, 12, 3, matiere(0xd62828));
      tour.position.set(6, 6, -4);
      g.add(garage, tour);
      return g;
    },
  },
  {
    id: 'hotel', nom: 'Hôtel', emoji: '🏨',
    fabriquer() {
      const g = new THREE.Group();
      const largeur = 14;
      const profondeur = 12;
      const hauteur = 20;
      const murs = boite(largeur, hauteur, profondeur, matiere(0xf4f1de));
      murs.position.y = hauteur / 2;
      const toit = boite(largeur + 0.6, 0.6, profondeur + 0.6, matiere(0x3b7dd8));
      toit.position.y = hauteur + 0.3;
      g.add(murs, toit);
      const vitre = matiere(0x9fd8ff, { metalness: 0.3, roughness: 0.2 });
      for (let etage = 0; etage < 5; etage++) {
        for (let i = 0; i < 4; i++) {
          if (etage === 0 && (i === 1 || i === 2)) continue; // la place de l'entrée
          const fenetre = boite(2, 2, 0.1, vitre);
          fenetre.position.set(-5.25 + i * 3.5, 2.5 + etage * 3.8, profondeur / 2 + 0.06);
          g.add(fenetre);
        }
      }
      const entree = boite(5, 3.2, 0.12, vitre);
      entree.position.set(0, 1.6, profondeur / 2 + 0.07);
      const auvent = boite(7, 0.3, 2.5, matiere(0xe63946));
      auvent.position.set(0, 3.5, profondeur / 2 + 1.2);
      const nom = panneau('🏨 HÔTEL ILYZGO', 12, 2, { fond: '#16324f' });
      nom.position.set(0, hauteur + 1.8, profondeur / 2 - 0.5);
      g.add(entree, auvent, nom);
      return g;
    },
  },
  {
    id: 'jeux', nom: 'Aire de jeux', emoji: '🛝',
    fabriquer() {
      const g = new THREE.Group();
      const sable = boite(14, 0.12, 11, matiere(0xf4dc8a));
      sable.position.y = 0.06;
      g.add(sable);
      // Le toboggan : une tour, une échelle et une glissière rouge
      for (const x of [-5.5, -3.5]) {
        for (const z of [-3, -1]) {
          const poteau = boite(0.2, 3.2, 0.2, matiere(0x3a86ff));
          poteau.position.set(x, 1.6, z);
          g.add(poteau);
        }
      }
      const plateforme = boite(2.2, 0.2, 2.2, matiere(0xffbe0b));
      plateforme.position.set(-4.5, 2.6, -2);
      const toitTour = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 4), matiere(0xe63946));
      toitTour.position.set(-4.5, 4, -2);
      toitTour.rotation.y = Math.PI / 4;
      const glissiere = boite(1.2, 0.15, 5.4, matiere(0xe63946));
      glissiere.position.set(-4.5, 1.35, 2.3);
      glissiere.rotation.x = 0.52;
      g.add(plateforme, toitTour, glissiere);
      for (let i = 0; i < 5; i++) {
        const barreau = boite(1, 0.1, 0.1, matiere(0xffffff));
        barreau.position.set(-4.5, 0.5 + i * 0.5, -3.3);
        g.add(barreau);
      }
      // La balançoire
      for (const x of [1.5, 5.5]) {
        for (const sens of [-1, 1]) {
          const pied = boite(0.2, 3.6, 0.2, matiere(0x2a9d8f));
          pied.position.set(x, 1.7, sens * 0.8);
          pied.rotation.x = sens * 0.25;
          g.add(pied);
        }
      }
      const barre = boite(4.4, 0.2, 0.2, matiere(0x2a9d8f));
      barre.position.set(3.5, 3.4, 0);
      g.add(barre);
      for (const x of [2.5, 4.5]) {
        for (const dx of [-0.35, 0.35]) {
          const corde = boite(0.05, 2.4, 0.05, matiere(0x555555));
          corde.position.set(x + dx, 2.2, 0);
          g.add(corde);
        }
        const siege = boite(0.9, 0.1, 0.4, matiere(0xe63946));
        siege.position.set(x, 1, 0);
        g.add(siege);
      }
      return g;
    },
  },
  {
    id: 'arbre', nom: 'Arbre', emoji: '🌲',
    fabriquer: (hasard) => creerSapin(0.9 + hasard() * 0.6),
  },
];

// Mesure un bâtiment : son rayon (pour l'espace qu'il prend) et sa hauteur
function mesurer(modele) {
  const taille = new THREE.Box3().setFromObject(modele).getSize(new THREE.Vector3());
  return {
    rayon: Math.hypot(taille.x, taille.z) / 2,   // le cercle qui contient tout le bâtiment
    demiLargeur: Math.max(taille.x, taille.z) / 2,
    hauteur: taille.y,
  };
}

// Peut-on construire ici ? Renvoie null si oui, ou la raison si non.
function verifierEmplacement(x, z, rayon) {
  const reservee = zoneReservee(x, z, rayon);
  if (reservee) return `On ne peut pas construire sur ${reservee}`;
  let hMin = Infinity;
  let hMax = -Infinity;
  // On regarde le centre et des points tout autour
  const points = [[0, 0]];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    points.push([Math.cos(a) * rayon * 0.85, Math.sin(a) * rayon * 0.85]);
    points.push([Math.cos(a + 0.4) * rayon * 0.45, Math.sin(a + 0.4) * rayon * 0.45]);
  }
  for (const [dx, dz] of points) {
    const h = hauteurDuSol(x + dx, z + dz);
    if (h < 1) return 'Il y a de l\'eau ici';
    if (hauteurDesObstacles(x + dx, z + dz) > 0) return 'Il y a déjà quelque chose ici';
    hMin = Math.min(hMin, h);
    hMax = Math.max(hMax, h);
  }
  if (hMax - hMin > 3) return 'Le terrain est trop en pente';
  return null;
}

// Rend un modèle transparent (pour l'aperçu)
function rendreTransparent(modele) {
  modele.traverse((objet) => {
    if (!objet.isMesh) return;
    const rendre = (m) => {
      const copie = m.clone();
      copie.transparent = true;
      copie.opacity = 0.55;
      copie.depthWrite = false;
      return copie;
    };
    objet.material = Array.isArray(objet.material) ? objet.material.map(rendre) : rendre(objet.material);
  });
}

// ============================================================
//  Le constructeur : gère le menu, l'aperçu et la pose des bâtiments
// ============================================================
export function creerConstructeur(scene) {
  const $ = (id) => document.getElementById(id);
  const ui = {
    panneau: $('construction'),
    choix: $('construction-choix'),
    liste: $('construction-liste'),
    placement: $('construction-placement'),
    info: $('construction-info'),
    bouton: $('bouton-construire'),
  };

  let actif = false;       // on est à pied ?
  let etat = null;         // null, 'choix' (le menu) ou 'placer' (l'aperçu)
  let type = null;
  let apercu = null;
  let mesures = null;
  let graine = 1;          // pour que le bâtiment construit ressemble à l'aperçu
  let rotation = 0;        // rotation en plus, avec R
  let raison = null;       // pourquoi on ne peut pas construire (ou null)
  let nombre = 0;          // nombre de constructions

  // Le cercle vert / rouge au sol
  const anneau = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  anneau.rotation.x = -Math.PI / 2;
  anneau.visible = false;
  scene.add(anneau);

  // Les boutons du menu de construction
  ui.liste.innerHTML = TYPES_BATIMENTS.map((t, i) => `
    <button class="choix-batiment" data-id="${t.id}">
      <span class="emoji">${t.emoji}</span><span>${t.nom}</span><kbd>${i + 1}</kbd>
    </button>`).join('');
  ui.liste.querySelectorAll('.choix-batiment').forEach((bouton) => {
    bouton.addEventListener('click', () => choisir(TYPES_BATIMENTS.find((t) => t.id === bouton.dataset.id)));
  });
  ui.bouton.addEventListener('click', ouvrir);
  ui.panneau.querySelector('.fermer').addEventListener('click', fermer);
  ui.placement.querySelector('[data-action="tourner"]').addEventListener('click', tourner);
  ui.placement.querySelector('[data-action="poser"]').addEventListener('click', poser);
  ui.placement.querySelector('[data-action="annuler"]').addEventListener('click', () => ouvrir());

  // Le clavier : B, 1 à 8, R, Entrée, Échap
  window.addEventListener('keydown', (e) => {
    if (!actif || e.repeat || document.body.classList.contains('menu-ouvert')) return;
    if (e.code === 'KeyB') { if (etat) fermer(); else ouvrir(); }
    else if (etat === 'choix') {
      const chiffre = e.code.match(/^(?:Digit|Numpad)([1-8])$/);
      if (chiffre) choisir(TYPES_BATIMENTS[Number(chiffre[1]) - 1]);
      if (e.code === 'Escape') fermer();
    } else if (etat === 'placer') {
      if (e.code === 'KeyR') tourner();
      if (e.code === 'Enter') poser();
      if (e.code === 'Escape') ouvrir();
    }
  });

  function enleverApercu() {
    if (apercu) scene.remove(apercu);
    apercu = null;
    anneau.visible = false;
  }

  // Ouvre le menu des bâtiments
  function ouvrir() {
    if (!actif) return;
    enleverApercu();
    etat = 'choix';
    ui.panneau.hidden = false;
    ui.choix.hidden = false;
    ui.placement.hidden = true;
  }

  // Ferme tout
  function fermer() {
    enleverApercu();
    etat = null;
    ui.panneau.hidden = true;
  }

  // On a choisi un bâtiment : l'aperçu apparaît devant le personnage
  function choisir(nouveauType) {
    type = nouveauType;
    enleverApercu();
    graine = Math.floor(Math.random() * 1e6);
    apercu = type.fabriquer(creerHasard(graine));
    mesures = mesurer(apercu);
    rendreTransparent(apercu);
    scene.add(apercu);
    anneau.visible = true;
    anneau.scale.setScalar(mesures.rayon);
    etat = 'placer';
    ui.choix.hidden = true;
    ui.placement.hidden = false;
  }

  function tourner() {
    rotation += Math.PI / 4;
  }

  // Construit le bâtiment pour de vrai
  function poser() {
    if (etat !== 'placer' || !apercu) return;
    if (raison) {
      afficherMessage(`❌ ${raison}`, 2);
      return;
    }
    const batiment = type.fabriquer(creerHasard(graine));
    batiment.position.copy(apercu.position);
    batiment.rotation.y = apercu.rotation.y;
    scene.add(batiment);
    ajouterObstacle(batiment.position.x, batiment.position.z, mesures.demiLargeur, batiment.position.y + mesures.hauteur);
    nombre++;
    afficherMessage(`🎉 Bravo ! ${type.emoji} ${type.nom} : c'est construit !`, 3);
    choisir(type); // on peut en construire un autre tout de suite
  }

  // Appelé à chaque image : l'aperçu suit le personnage
  function mettreAJour(pieton) {
    ui.bouton.hidden = !actif || etat !== null;
    if (etat !== 'placer' || !apercu) return;
    const p = pieton.etat.position;
    const a = pieton.etat.angle;
    const distance = mesures.rayon + 2.5;
    const x = p.x - Math.sin(a) * distance;
    const z = p.z - Math.cos(a) * distance;
    const sol = hauteurDuSol(x, z);
    apercu.position.set(x, sol - 0.2, z);
    apercu.rotation.y = a + rotation; // la porte regarde vers le personnage
    raison = verifierEmplacement(x, z, mesures.rayon);
    anneau.position.set(x, sol + 0.2, z);
    anneau.material.color.setHex(raison ? 0xef4444 : 0x22c55e);
    ui.info.textContent = raison ? `❌ ${raison}` : `${type.emoji} ${type.nom} : c'est possible ici !`;
    ui.placement.querySelector('[data-action="poser"]').disabled = !!raison;
  }

  return {
    mettreAJour,
    // Le constructeur ne marche qu'à pied
    setActif(valeur) {
      actif = valeur;
      ui.bouton.hidden = !actif;
      if (!actif) fermer();
    },
    estOuvert: () => etat !== null,
    nombre: () => nombre,
  };
}
