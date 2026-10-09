// ============================================================
//  L'AVION ILYZGO AIR : son modèle, son vol, l'atterrissage et la caméra
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { hauteurDuSol, hauteurDesObstacles, surLaPiste, PISTE } from './world.js';
import { afficherMessage } from './ui.js';

// --- Les touches du clavier ---
const touches = {};
let gazDemande = null; // quand on appuie sur un chiffre, on règle les gaz directement

window.addEventListener('keydown', (e) => {
  touches[e.code] = true;
  // Les chiffres 0 à 9 règlent les gaz : 0 = coupé, 5 = 50 %, 9 = 90 %
  const chiffre = e.code.match(/^(?:Digit|Numpad)(\d)$/);
  if (chiffre) gazDemande = Number(chiffre[1]) / 10;
  // Empêche les flèches et Espace de faire défiler la page
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { touches[e.code] = false; });

const appuye = {
  gauche: () => touches.ArrowLeft,
  droite: () => touches.ArrowRight,
  piquer: () => touches.ArrowUp,
  cabrer: () => touches.ArrowDown,
  plusDeGaz: () => touches.Space,
  moinsDeGaz: () => touches.ShiftLeft || touches.ShiftRight,
  freins: () => touches.KeyF,
};

// ============================================================
//  LE MODÈLE 3D
//  L'avant de l'avion pointe vers -Z, le haut vers +Y.
// ============================================================

// Le fuselage va du capot moteur (z = -3.6) jusqu'à la queue (z = 4.6)
const FUSELAGE_DEBUT = -3.6;
const FUSELAGE_FIN = 4.6;

// Le rayon du fuselage selon l'endroit : capot, cabine, puis queue de plus en plus fine
function rayonFuselage(z) {
  if (z < -2.6) return 0.6 + 0.3 * Math.sin(((z - FUSELAGE_DEBUT) / 1.0) * Math.PI / 2);
  if (z < 0.2) return 0.9;
  return 0.9 - 0.68 * ((z - 0.2) / (FUSELAGE_FIN - 0.2));
}

// La queue remonte un peu, comme sur un vrai avion
function remonteeQueue(z) {
  return z > 0.2 ? (z - 0.2) * 0.12 : 0;
}

// La "livrée" : la peinture de l'avion, dessinée dans une image qu'on enroule autour du fuselage.
// Dans l'image : de gauche à droite = le tour du fuselage (dessous, côté droit, dessus, côté gauche),
// de bas en haut = du nez vers la queue.
function creerLivree() {
  const W = 1024;
  const H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const longueur = FUSELAGE_FIN - FUSELAGE_DEBUT;
  const yImage = (z) => (1 - (z - FUSELAGE_DEBUT) / longueur) * H;

  // Peint une zone : "tour" de t0 à t1 (0 = dessous, 0.25 = côté droit, 0.5 = dessus),
  // de z0 à z1 le long de l'avion. Par défaut on peint les deux côtés pareil.
  function zone(t0, t1, z0, z1, couleur, deuxCotes = true) {
    g.fillStyle = couleur;
    const y0 = yImage(z1);
    const h = yImage(z0) - y0;
    g.fillRect(t0 * W, y0, (t1 - t0) * W, h);
    if (deuxCotes) g.fillRect((1 - t1) * W, y0, (t1 - t0) * W, h);
  }

  zone(0, 1, FUSELAGE_DEBUT, FUSELAGE_FIN, '#ffffff', false);          // tout blanc
  zone(0, 0.1, FUSELAGE_DEBUT, FUSELAGE_FIN, '#d9dde3');               // le ventre gris clair
  zone(0, 1, FUSELAGE_DEBUT, -2.7, CONFIG.couleurAvion, false);        // le capot rouge
  zone(0.2, 0.235, -2.7, FUSELAGE_FIN, CONFIG.couleurAvion);           // la bande rouge
  zone(0.183, 0.193, -2.7, FUSELAGE_FIN, CONFIG.couleurAvion2);        // le filet bleu
  zone(0.40, 0.60, -2.55, -1.75, '#16324f', false);                    // le pare-brise
  zone(0.30, 0.37, -1.6, -0.95, '#16324f');                            // fenêtre avant
  zone(0.30, 0.37, -0.75, -0.15, '#16324f');                           // fenêtre arrière
  zone(0.33, 0.335, -1.6, -0.15, '#ffffff');                           // petit reflet

  // Le nom de l'avion, sur les deux côtés de la queue
  function ecrireNom(t, angle) {
    g.save();
    g.translate(t * W, yImage(2.0));
    g.rotate(angle);
    g.font = 'bold 80px "Arial Black", Arial, sans-serif';
    g.fillStyle = CONFIG.couleurAvion;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(CONFIG.nomAvion, 0, 0);
    g.restore();
  }
  ecrireNom(0.28, Math.PI / 2);   // côté droit
  ecrireNom(0.72, -Math.PI / 2);  // côté gauche

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// Le logo sur la dérive (l'aileron vertical de la queue)
function creerLogoDerive() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 400;
  const g = canvas.getContext('2d');
  g.fillStyle = CONFIG.couleurAvion;
  g.fillRect(0, 0, 256, 400);
  // Une vague de vent blanche
  g.strokeStyle = '#ffffff';
  g.lineWidth = 18;
  g.beginPath();
  g.moveTo(10, 330);
  g.bezierCurveTo(90, 250, 170, 380, 250, 270);
  g.stroke();
  // Les initiales
  g.fillStyle = '#ffffff';
  g.font = 'bold 120px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('IA', 128, 150);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Fabrique l'avion complet. On peut en fabriquer plusieurs (un pour le joueur, un garé au parking).
export function creerModele() {
  const avion = new THREE.Group();
  const pieces = {}; // les pièces qui bougent

  const matiere = (couleur, extra = {}) =>
    new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.5, metalness: 0.1, ...extra });
  const matBlanc = matiere(0xffffff);
  const matRouge = matiere(CONFIG.couleurAvion);
  const matSombre = matiere(0x2b2b2b);
  const matVitre = matiere(0x16324f, { roughness: 0.1, metalness: 0.5 });
  const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
  const lumiere = (couleur) => new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 2 })
  );

  // ---- Le fuselage (forme arrondie qui s'affine vers la queue) ----
  const profil = [];
  for (let z = FUSELAGE_DEBUT; z <= FUSELAGE_FIN + 0.001; z += 0.2) {
    profil.push(new THREE.Vector2(rayonFuselage(z), z));
  }
  const geoFuselage = new THREE.LatheGeometry(profil, 24);
  geoFuselage.rotateX(Math.PI / 2);
  const pos = geoFuselage.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + remonteeQueue(pos.getZ(i)));
  geoFuselage.computeVertexNormals();
  const fuselage = new THREE.Mesh(geoFuselage, new THREE.MeshStandardMaterial({
    map: creerLivree(), roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide,
  }));
  avion.add(fuselage);

  // Les bouchons à l'avant (entrée d'air du moteur) et au bout de la queue
  const avant = new THREE.Mesh(new THREE.CircleGeometry(rayonFuselage(FUSELAGE_DEBUT), 24), matSombre);
  avant.rotation.y = Math.PI;
  avant.position.z = FUSELAGE_DEBUT;
  const arriere = new THREE.Mesh(new THREE.CircleGeometry(rayonFuselage(FUSELAGE_FIN), 12), matBlanc);
  arriere.position.set(0, remonteeQueue(FUSELAGE_FIN), FUSELAGE_FIN);
  avion.add(avant, arriere);

  // Le pot d'échappement sous le capot
  const echappement = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), matSombre);
  echappement.rotation.x = Math.PI / 2;
  echappement.position.set(0.3, -0.62, -2.7);
  avion.add(echappement);

  // ---- L'hélice ----
  const casserole = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.7, 16), matBlanc); // le cône pointu
  casserole.rotation.x = -Math.PI / 2;
  casserole.position.z = FUSELAGE_DEBUT - 0.35;
  avion.add(casserole);

  const helice = new THREE.Group();
  helice.position.z = FUSELAGE_DEBUT - 0.15;
  const matJaune = matiere(0xffd400);
  for (const sens of [-1, 1]) {
    const pale = boite(0.2, 1.6, 0.05, matSombre);
    pale.position.y = sens * 0.9;
    pale.rotation.y = sens * 0.25; // les pales sont un peu vrillées
    const bout = boite(0.2, 0.2, 0.06, matJaune); // bouts jaunes, comme sur les vrais avions
    bout.position.y = sens * 1.75;
    helice.add(pale, bout);
  }
  avion.add(helice);
  pieces.helice = helice;

  // Le disque flou qu'on voit quand l'hélice tourne vite
  const disque = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 32),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  disque.position.z = FUSELAGE_DEBUT - 0.2;
  avion.add(disque);
  pieces.disque = disque;

  // ---- Les ailes (posées sur le dessus du fuselage) ----
  pieces.volets = [];
  for (const cote of [-1, 1]) {
    const aile = new THREE.Group();
    aile.position.set(0, 1.0, -0.9);
    aile.rotation.z = cote * 0.04; // le "dièdre" : les ailes remontent un peu vers le bout

    // La partie avant de l'aile (fixe)
    const interieur = boite(3.2, 0.16, 1.15, matBlanc);
    interieur.position.set(cote * 1.6, 0, -0.225);
    const exterieur = boite(2.3, 0.14, 1.15, matBlanc);
    exterieur.position.set(cote * 4.35, 0, -0.225);
    aile.add(interieur, exterieur);

    // Le volet (près du fuselage) : il descend quand on appuie sur F en vol
    const charniereVolet = new THREE.Group();
    charniereVolet.position.set(cote * 1.85, 0, 0.35);
    const volet = boite(2.7, 0.1, 0.45, matBlanc);
    volet.position.z = 0.225;
    charniereVolet.add(volet);
    aile.add(charniereVolet);
    pieces.volets.push(charniereVolet);

    // L'aileron (au bout) : il monte d'un côté et descend de l'autre pour pencher l'avion
    const charniereAileron = new THREE.Group();
    charniereAileron.position.set(cote * 4.35, 0, 0.35);
    const aileron = boite(2.3, 0.1, 0.45, matRouge);
    aileron.position.z = 0.225;
    charniereAileron.add(aileron);
    aile.add(charniereAileron);
    pieces[cote < 0 ? 'aileronGauche' : 'aileronDroit'] = charniereAileron;

    // Le saumon (bout d'aile) rouge et le feu de position : rouge à gauche, vert à droite
    const saumon = boite(0.25, 0.18, 1.6, matRouge);
    saumon.position.set(cote * 5.62, 0, 0);
    const feu = lumiere(cote < 0 ? 0xff2020 : 0x20ff40);
    feu.position.set(cote * 5.78, 0, -0.3);
    aile.add(saumon, feu);
    avion.add(aile);

    // Le hauban : la barre qui tient l'aile
    const hauban = boite(0.1, 2.52, 0.18, matBlanc);
    hauban.position.set(cote * 1.85, 0.34, -0.8);
    hauban.rotation.z = -cote * 0.986;
    avion.add(hauban);
  }

  // ---- La queue ----
  // Le stabilisateur (petite aile horizontale) et la gouverne de profondeur
  const stabilisateur = new THREE.Group();
  stabilisateur.position.set(0, 0.45, 3.7);
  stabilisateur.add(boite(4.2, 0.1, 0.8, matBlanc));
  const charniereProfondeur = new THREE.Group();
  charniereProfondeur.position.z = 0.4;
  const profondeur = boite(4.2, 0.08, 0.5, matRouge);
  profondeur.position.z = 0.25;
  charniereProfondeur.add(profondeur);
  stabilisateur.add(charniereProfondeur);
  avion.add(stabilisateur);
  pieces.profondeur = charniereProfondeur;

  // La dérive (aileron vertical) avec le logo, et la gouverne de direction
  const derive = new THREE.Group();
  derive.position.set(0, 0.75, 3.5);
  derive.rotation.x = 0.35; // penchée vers l'arrière
  const matDerive = matiere(CONFIG.couleurAvion);
  const plaqueDerive = boite(0.1, 1.7, 1.1, matDerive);
  plaqueDerive.position.y = 0.85;
  derive.add(plaqueDerive);
  const logo = creerLogoDerive();
  for (const cote of [-1, 1]) {
    const autocollant = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.7), new THREE.MeshStandardMaterial({ map: logo }));
    autocollant.rotation.y = cote * Math.PI / 2;
    autocollant.position.set(cote * 0.056, 0.85, 0);
    derive.add(autocollant);
  }
  const charniereDirection = new THREE.Group();
  charniereDirection.position.set(0, 0.85, 0.55);
  const direction = boite(0.08, 1.7, 0.45, matDerive);
  direction.position.z = 0.225;
  charniereDirection.add(direction);
  derive.add(charniereDirection);
  pieces.direction = charniereDirection;
  // Le gyrophare rouge qui clignote en haut de la dérive
  const gyrophare = lumiere(0xff2020);
  gyrophare.position.set(0, 1.75, 0.1);
  derive.add(gyrophare);
  pieces.gyrophare = gyrophare;
  avion.add(derive);

  // Le feu blanc au bout de la queue
  const feuArriere = lumiere(0xffffff);
  feuArriere.position.set(0, remonteeQueue(FUSELAGE_FIN), FUSELAGE_FIN + 0.05);
  avion.add(feuArriere);

  // ---- Le train d'atterrissage ----
  const geoRoue = new THREE.CylinderGeometry(0.38, 0.38, 0.22, 14);
  geoRoue.rotateZ(Math.PI / 2);
  const geoCarenage = new THREE.SphereGeometry(0.5, 12, 8);
  for (const cote of [-1, 1]) {
    const roue = new THREE.Mesh(geoRoue, matSombre);
    roue.position.set(cote * 1.3, -1.45, -0.4);
    // Le carénage : la "chaussure" profilée autour de la roue
    const carenage = new THREE.Mesh(geoCarenage, matRouge);
    carenage.scale.set(0.55, 0.75, 1.6);
    carenage.position.set(cote * 1.3, -1.33, -0.4);
    // La jambe du train, en acier souple
    const jambe = boite(0.12, 1.1, 0.2, matBlanc);
    jambe.position.set(cote * 0.875, -1.1, -0.4);
    jambe.rotation.z = cote * 0.88;
    avion.add(roue, carenage, jambe);
  }
  const roueAvant = new THREE.Mesh(geoRoue, matSombre);
  roueAvant.position.set(0, -1.45, -3.0);
  const carenageAvant = new THREE.Mesh(geoCarenage, matRouge);
  carenageAvant.scale.set(0.45, 0.6, 1.3);
  carenageAvant.position.set(0, -1.35, -3.0);
  const jambeAvant = boite(0.12, 0.75, 0.12, matSombre);
  jambeAvant.position.set(0, -1.1, -3.0);
  avion.add(roueAvant, carenageAvant, jambeAvant);

  avion.userData.pieces = pieces;
  return avion;
}

// Fait bouger les pièces de l'avion : hélice, gouvernes, volets, lumières
function animerModele(modele, c, dt) {
  const p = modele.userData.pieces;
  const doux = Math.min(1, dt * 8); // les gouvernes bougent en douceur
  const vers = (objet, axe, cible) => { objet.rotation[axe] += (cible - objet.rotation[axe]) * doux; };

  p.helice.rotation.z += dt * (4 + c.gaz * 45);
  p.disque.material.opacity = c.gaz * 0.25;

  vers(p.aileronGauche, 'x', -c.virage * 0.4); // virage à gauche : aileron gauche monte
  vers(p.aileronDroit, 'x', c.virage * 0.4);   // … et aileron droit descend
  vers(p.profondeur, 'x', -c.monter * 0.4);
  vers(p.direction, 'y', -c.virage * 0.35);
  for (const volet of p.volets) vers(volet, 'x', c.volets ? 0.6 : 0);

  p.gyrophare.material.emissiveIntensity = Math.sin(c.temps * 6) > 0.8 ? 4 : 0.2;
}

// Une ombre ronde sous l'avion : très utile pour savoir à quelle hauteur on est !
function creerOmbre() {
  return new THREE.Mesh(
    new THREE.CircleGeometry(1, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })
  );
}

// ============================================================
//  LE VOL
// ============================================================
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
    gaz: 0,           // puissance du moteur : 0 = coupé, 1 = à fond
    auSol: false,
    decroche: false,
    volets: false,    // volets sortis (F en vol)
    freins: false,    // freins serrés (F au sol)
    hauteurSol: 0,    // hauteur des roues au-dessus du sol
    atterrissages: 0, // nombre d'atterrissages réussis
  };
  let temps = 0;

  // --- Le départ ---
  if (CONFIG.departSurLaPiste) {
    // Posé au bout de la piste, le nez dans l'axe
    const z = PISTE.z + PISTE.longueur / 2 - 30;
    etat.position.set(PISTE.x, hauteurDuSol(PISTE.x, z) + CONFIG.hauteurRoues, z);
    etat.auSol = true;
    afficherMessage(`Bienvenue à bord d'${CONFIG.nomAvion} ! Mets les gaz (touche 9 ou Espace), puis ↓ pour décoller`, 7);
  } else {
    // En vol, face à la piste
    etat.position.set(PISTE.x, CONFIG.altitudeDepart, PISTE.z + PISTE.longueur / 2 + 400);
    etat.gaz = CONFIG.gazDepart;
    etat.vitesse = CONFIG.vitesseMin + etat.gaz * (CONFIG.vitesseMax - CONFIG.vitesseMin);
  }

  // Les commandes de cette image (pour faire bouger les gouvernes)
  let virage = 0;
  let monter = 0;

  // ---------- En vol ----------
  function volerEnLAir(dt) {
    etat.freins = false;
    etat.volets = appuye.freins();

    // 1) Pencher avec ← / → . Plus l'avion penche, plus il tourne (comme un vrai !)
    virage = (appuye.gauche() ? 1 : 0) - (appuye.droite() ? 1 : 0);
    if (virage !== 0) etat.inclinaison += virage * CONFIG.vitesseRoulis * dt;
    else etat.inclinaison -= etat.inclinaison * Math.min(1, dt * CONFIG.retourHorizontal);
    etat.inclinaison = THREE.MathUtils.clamp(etat.inclinaison, -CONFIG.inclinaisonMax, CONFIG.inclinaisonMax);
    etat.cap += Math.sin(etat.inclinaison) * CONFIG.vitesseVirage * dt;

    // 2) Piquer (↑) / cabrer (↓), comme un vrai manche
    monter = (appuye.cabrer() ? 1 : 0) - (appuye.piquer() ? 1 : 0);
    etat.tangage += monter * CONFIG.vitesseTangage * dt;
    if (monter === 0) etat.tangage -= etat.tangage * Math.min(1, dt * CONFIG.retourHorizontal);

    // 3) Décrochage : trop lent, les ailes ne portent plus, le nez tombe
    const decroche = etat.vitesse < CONFIG.vitesseDecrochage;
    if (decroche && !etat.decroche) afficherMessage('Décrochage ! Remets des gaz et pique du nez (↑)', 3);
    etat.decroche = decroche;
    if (decroche) etat.tangage -= 0.8 * dt;
    etat.tangage = THREE.MathUtils.clamp(etat.tangage, -0.8, 0.8);

    // 4) La vitesse : les gaz poussent, la gravité freine en montée et accélère en piqué
    const vitesseGaz = CONFIG.vitesseMin + etat.gaz * (CONFIG.vitesseMax - CONFIG.vitesseMin);
    etat.vitesse += (vitesseGaz - etat.vitesse) * Math.min(1, dt * CONFIG.reactiviteMoteur);
    etat.vitesse -= Math.sin(etat.tangage) * CONFIG.gravite * dt;
    if (etat.volets) etat.vitesse -= CONFIG.aerofreins * dt;
    etat.vitesse = THREE.MathUtils.clamp(etat.vitesse, 8, CONFIG.vitesseMax * 1.25);

    // 5) Avancer dans la direction où pointe le nez
    const sens = new THREE.Vector3(
      -Math.sin(etat.cap) * Math.cos(etat.tangage),
      Math.sin(etat.tangage),
      -Math.cos(etat.cap) * Math.cos(etat.tangage)
    );
    etat.position.addScaledVector(sens, etat.vitesse * dt);

    // 6) La portance : si l'avion est lent, les ailes le portent moins et il descend doucement.
    //    C'est comme ça qu'on se prépare à atterrir : on réduit les gaz.
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
          etat.auSol = true;
          etat.tangage = 0;
          etat.inclinaison = 0;
          etat.decroche = false;
          etat.atterrissages++;
          afficherMessage('Bravo, atterrissage réussi ! 🛬  Coupe les gaz (0) et freine avec F', 4);
          return;
        }
        afficherMessage(assezLent
          ? 'Trop penché ! Arrive bien à plat sur la piste.'
          : `Trop vite pour atterrir ! (max ${kmh(CONFIG.vitesseAtterrissageMax)} km/h) Réduis les gaz.`, 3);
      }
      // Rebond doux vers le haut (l'avion ne peut pas s'écraser)
      etat.position.y = sol + CONFIG.hauteurRoues;
      etat.tangage = 0.3;
    }

    // 8) Les maisons et les bâtiments : on rebondit par-dessus
    const obstacle = hauteurDesObstacles(x, z);
    if (obstacle > 0 && etat.position.y - CONFIG.hauteurRoues < obstacle) {
      etat.position.y = obstacle + CONFIG.hauteurRoues;
      etat.tangage = 0.3;
    }
  }

  // ---------- Au sol ----------
  function roulerAuSol(dt) {
    // L'avion reste à plat
    etat.tangage = 0;
    etat.inclinaison = 0;
    etat.decroche = false;
    etat.volets = false;
    etat.freins = appuye.freins();

    // Tourner avec ← / → (seulement si on roule)
    virage = (appuye.gauche() ? 1 : 0) - (appuye.droite() ? 1 : 0);
    monter = appuye.cabrer() ? 1 : 0;
    etat.cap += virage * CONFIG.vitesseVirageSol * dt * Math.min(1, etat.vitesse / 8);

    // La vitesse : les gaz poussent, les roues freinent un peu, F freine fort
    const vitesseGaz = etat.gaz * CONFIG.vitesseMax;
    etat.vitesse += (vitesseGaz - etat.vitesse) * Math.min(1, dt * 0.4);
    if (etat.freins) etat.vitesse -= CONFIG.freinage * dt;
    etat.vitesse = Math.max(etat.vitesse, 0);

    // Avancer, sauf si on arrive dans l'eau ou contre un bâtiment
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
    if (appuye.cabrer()) {
      if (etat.vitesse >= CONFIG.vitesseDecollage) {
        etat.auSol = false;
        etat.tangage = 0.12;
        etat.position.y += 0.5;
        afficherMessage('Décollage ! ✈️', 2);
      } else {
        afficherMessage(`Pas assez de vitesse pour décoller (il faut ${kmh(CONFIG.vitesseDecollage)} km/h) : mets les gaz !`, 2);
      }
    }
  }

  // Appelé à chaque image. dt = temps écoulé depuis l'image précédente (en secondes)
  function mettreAJour(dt) {
    temps += dt;

    // Les gaz : un chiffre de 0 à 9 pour les régler d'un coup, ou Espace / Shift pour doser
    if (gazDemande !== null) {
      etat.gaz = gazDemande;
      gazDemande = null;
    }
    if (appuye.plusDeGaz()) etat.gaz += CONFIG.vitesseManette * dt;
    if (appuye.moinsDeGaz()) etat.gaz -= CONFIG.vitesseManette * dt;
    etat.gaz = THREE.MathUtils.clamp(etat.gaz, 0, 1);

    if (etat.auSol) roulerAuSol(dt);
    else volerEnLAir(dt);

    const { x, z } = etat.position;
    const sol = Math.max(hauteurDuSol(x, z), 0);
    etat.hauteurSol = etat.position.y - CONFIG.hauteurRoues - sol;

    // On place le modèle 3D et on fait bouger ses pièces
    modele.position.copy(etat.position);
    modele.rotation.set(etat.tangage, etat.cap, etat.inclinaison, 'YXZ');
    animerModele(modele, { gaz: etat.gaz, virage, monter, volets: etat.volets, temps }, dt);

    // L'ombre : sur le sol, plus petite et plus pâle quand on monte
    const loin = Math.min(etat.hauteurSol / 150, 1);
    ombre.position.set(x, sol + 0.2, z);
    ombre.rotation.set(-Math.PI / 2, 0, etat.cap);
    ombre.scale.set(5.5 * (1 - loin * 0.5), 4.5 * (1 - loin * 0.5), 1);
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

// Convertit une vitesse du jeu en km/h (pour l'affichage)
export function kmh(vitesse) {
  return Math.round(vitesse * 3.6);
}
