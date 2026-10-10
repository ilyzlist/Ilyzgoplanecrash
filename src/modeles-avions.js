// ============================================================
//  LES MODÈLES 3D DES AVIONS
//  - ILYZGO AIR            : le petit avion à hélice
//  - ILYZGO AIR EXPRESS    : le supersonique à aile delta (comme le Concorde)
//  - ILYZGO AIR PASSENGERS : le géant à 4 réacteurs (comme le Boeing 747)
//
//  Pour tous les avions : l'avant pointe vers -Z, le haut vers +Y.
// ============================================================
import * as THREE from 'three';
import { CONFIG } from './config.js';

// ---------- Petits outils ----------
const matiere = (couleur, extra = {}) =>
  new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.5, metalness: 0.1, ...extra });
const boite = (l, h, p, mat) => new THREE.Mesh(new THREE.BoxGeometry(l, h, p), mat);
const lumiere = (couleur, rayon = 0.12) => new THREE.Mesh(
  new THREE.SphereGeometry(rayon, 8, 6),
  new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 2 })
);

// Une roue (un cylindre couché sur le côté)
function geoRoue(rayon, largeur) {
  const geo = new THREE.CylinderGeometry(rayon, rayon, largeur, 14);
  geo.rotateZ(Math.PI / 2);
  return geo;
}

// Une forme plate (aile, dérive…) dessinée avec une liste de points, puis épaissie
function formePlate(points, epaisseur) {
  const forme = new THREE.Shape();
  forme.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) forme.lineTo(x, y);
  return new THREE.ExtrudeGeometry(forme, { depth: epaisseur, bevelEnabled: false });
}

// Une aile vue de dessus : points (x = envergure, z = avant/arrière), à plat
function aileAPlat(points, epaisseur, mat) {
  const geo = formePlate(points, epaisseur);
  geo.rotateX(Math.PI / 2); // la forme se couche : y devient z, l'épaisseur va vers le bas
  return new THREE.Mesh(geo, mat);
}

// Une dérive (aileron vertical) : points (z = avant/arrière, y = hauteur)
function deriveVerticale(points, epaisseur, mat) {
  const geo = formePlate(points.map(([z, y]) => [-z, y]), epaisseur);
  geo.translate(0, 0, -epaisseur / 2);
  geo.rotateY(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

// Le logo de la compagnie : un carré rouge avec une vague blanche et "IA"
function creerLogo() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 400;
  const g = canvas.getContext('2d');
  g.fillStyle = CONFIG.couleurAvion;
  g.fillRect(0, 0, 256, 400);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 18;
  g.beginPath();
  g.moveTo(10, 330);
  g.bezierCurveTo(90, 250, 170, 380, 250, 270);
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = 'bold 120px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('IA', 128, 150);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Colle le logo des deux côtés d'une dérive
function collerLogo(parent, largeur, hauteur, x, y, z) {
  const logo = creerLogo();
  for (const cote of [-1, 1]) {
    const autocollant = new THREE.Mesh(new THREE.PlaneGeometry(largeur, hauteur), new THREE.MeshStandardMaterial({ map: logo }));
    autocollant.rotation.y = cote * Math.PI / 2;
    autocollant.position.set(cote * x, y, z);
    parent.add(autocollant);
  }
}

// ============================================================
//  LE FUSELAGE (le "corps" de l'avion) avec sa peinture
//  On fait tourner un profil autour de l'axe de l'avion, puis on enroule
//  une image peinte autour. Dans l'image : de gauche à droite = le tour du
//  fuselage (t = 0 dessous, 0.25 côté droit, 0.5 dessus, 0.75 côté gauche),
//  de bas en haut = du nez vers la queue.
// ============================================================
function fabriquerFuselage({ debut, fin, rayon, remontee = () => 0, hauteurTexture, peindre }) {
  const longueur = fin - debut;
  const profil = [];
  let rayonMax = 0;
  for (let i = 0; i <= 80; i++) {
    const z = debut + (i / 80) * longueur;
    const r = Math.max(rayon(z), 0.001);
    rayonMax = Math.max(rayonMax, r);
    profil.push(new THREE.Vector2(r, z));
  }
  const geo = new THREE.LatheGeometry(profil, 24);
  geo.rotateX(Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + remontee(pos.getZ(i)));
  geo.computeVertexNormals();

  // L'image de la peinture
  const W = 1024;
  const H = hauteurTexture ?? THREE.MathUtils.clamp(Math.round((W * longueur) / (2 * Math.PI * rayonMax)), 512, 4096);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  const yImage = (z) => (1 - (z - debut) / longueur) * H;

  const outils = {
    // Peint une zone (par défaut des deux côtés pareil)
    zone(t0, t1, z0, z1, couleur, deuxCotes = true) {
      g.fillStyle = couleur;
      const y0 = yImage(z1);
      const h = yImage(z0) - y0;
      g.fillRect(t0 * W, y0, (t1 - t0) * W, h);
      if (deuxCotes) g.fillRect((1 - t1) * W, y0, (t1 - t0) * W, h);
    },
    // Une rangée de hublots
    hublots(t0, t1, z0, z1, nombre, couleur) {
      const pas = (z1 - z0) / nombre;
      for (let k = 0; k < nombre; k++) {
        const zc = z0 + (k + 0.5) * pas;
        outils.zone(t0, t1, zc - pas * 0.28, zc + pas * 0.28, couleur);
      }
    },
    // Écrit un texte des deux côtés, dans le bon sens de lecture
    ecrire(texte, zMilieu, t, taillePolice, couleur) {
      for (const [tCote, angle] of [[t, Math.PI / 2], [1 - t, -Math.PI / 2]]) {
        g.save();
        g.translate(tCote * W, yImage(zMilieu));
        g.rotate(angle);
        g.font = `bold ${taillePolice}px "Arial Black", Arial, sans-serif`;
        g.fillStyle = couleur;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(texte, 0, 0);
        g.restore();
      }
    },
  };
  peindre(outils);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texture, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide,
  }));
}

// ============================================================
//  L'ESCALIER pour monter dans les gros avions
//  porte = position de la porte (côté gauche de l'avion)
// ============================================================
function ajouterEscalier(avion, porte, hauteurRoues) {
  const escalier = new THREE.Group();
  const hauteur = hauteurRoues + porte.y; // hauteur de la porte au-dessus du sol
  const marches = Math.ceil(hauteur / 0.45);
  const haut = hauteur / marches;
  const profondeur = 0.55;
  const matMarche = matiere(0xdddddd);
  const matCote = matiere(0xffd400);
  for (let i = 0; i < marches; i++) {
    const marche = boite(profondeur, 0.15, 2.4, matMarche);
    marche.position.set(-(i + 0.5) * profondeur, -(i + 1) * haut, 0);
    escalier.add(marche);
  }
  // Les deux rampes jaunes
  const longueur = Math.hypot(marches * profondeur, hauteur);
  const angle = Math.atan2(hauteur, marches * profondeur);
  for (const cote of [-1, 1]) {
    const rampe = boite(longueur, 0.15, 0.12, matCote);
    rampe.position.set(-(marches * profondeur) / 2, -hauteur / 2 + 0.9, cote * 1.2);
    rampe.rotation.z = angle;
    escalier.add(rampe);
  }
  // Le petit camion sous l'escalier
  const camion = boite(marches * profondeur * 0.8, 1.2, 2.6, matiere(0x1d4ed8));
  camion.position.set(-(marches * profondeur) * 0.5, -hauteur + 0.6, 0);
  escalier.add(camion);

  escalier.position.set(porte.x - 0.2, porte.y, porte.z);
  avion.add(escalier);
  avion.userData.pieces.escalier = escalier;
  // On monte dans l'avion depuis le bas de l'escalier
  avion.userData.pointEmbarquement = new THREE.Vector3(porte.x - marches * profondeur - 1.5, -hauteurRoues, porte.z);
}

// ============================================================
//  1) ILYZGO AIR : le petit avion à hélice
// ============================================================
function creerLeger(nom) {
  const avion = new THREE.Group();
  const pieces = {};
  const debut = -3.6;
  const fin = 4.6;
  const rayon = (z) => {
    if (z < -2.6) return 0.6 + 0.3 * Math.sin(((z - debut) / 1.0) * Math.PI / 2);
    if (z < 0.2) return 0.9;
    return 0.9 - 0.68 * ((z - 0.2) / (fin - 0.2));
  };
  const remontee = (z) => (z > 0.2 ? (z - 0.2) * 0.12 : 0); // la queue remonte un peu

  const matBlanc = matiere(0xffffff);
  const matRouge = matiere(CONFIG.couleurAvion);
  const matSombre = matiere(0x2b2b2b);

  // Le fuselage et sa peinture
  avion.add(fabriquerFuselage({
    debut, fin, rayon, remontee, hauteurTexture: 2048,
    peindre(o) {
      o.zone(0, 1, debut, fin, '#ffffff', false);          // tout blanc
      o.zone(0, 0.1, debut, fin, '#d9dde3');               // le ventre gris clair
      o.zone(0, 1, debut, -2.7, CONFIG.couleurAvion, false); // le capot rouge
      o.zone(0.2, 0.235, -2.7, fin, CONFIG.couleurAvion);  // la bande rouge
      o.zone(0.183, 0.193, -2.7, fin, CONFIG.couleurAvion2); // le filet bleu
      o.zone(0.40, 0.60, -2.55, -1.75, '#16324f', false);  // le pare-brise
      o.zone(0.30, 0.37, -1.6, -0.95, '#16324f');          // fenêtre avant
      o.zone(0.30, 0.37, -0.75, -0.15, '#16324f');         // fenêtre arrière
      o.zone(0.33, 0.335, -1.6, -0.15, '#ffffff');         // petit reflet
      o.ecrire(nom, 2.0, 0.28, 80, CONFIG.couleurAvion);   // le nom
    },
  }));

  // Les bouchons à l'avant et au bout de la queue
  const avant = new THREE.Mesh(new THREE.CircleGeometry(rayon(debut), 24), matSombre);
  avant.rotation.y = Math.PI;
  avant.position.z = debut;
  const arriere = new THREE.Mesh(new THREE.CircleGeometry(rayon(fin), 12), matBlanc);
  arriere.position.set(0, remontee(fin), fin);
  avion.add(avant, arriere);

  // Le pot d'échappement
  const echappement = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6), matSombre);
  echappement.rotation.x = Math.PI / 2;
  echappement.position.set(0.3, -0.62, -2.7);
  avion.add(echappement);

  // L'hélice
  const casserole = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.7, 16), matBlanc);
  casserole.rotation.x = -Math.PI / 2;
  casserole.position.z = debut - 0.35;
  avion.add(casserole);
  const helice = new THREE.Group();
  helice.position.z = debut - 0.15;
  const matJaune = matiere(0xffd400);
  for (const sens of [-1, 1]) {
    const pale = boite(0.2, 1.6, 0.05, matSombre);
    pale.position.y = sens * 0.9;
    pale.rotation.y = sens * 0.25;
    const bout = boite(0.2, 0.2, 0.06, matJaune);
    bout.position.y = sens * 1.75;
    helice.add(pale, bout);
  }
  avion.add(helice);
  pieces.helice = helice;
  const disque = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 32),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  disque.position.z = debut - 0.2;
  avion.add(disque);
  pieces.disque = disque;

  // Les ailes, posées sur le dessus du fuselage
  pieces.volets = [];
  for (const cote of [-1, 1]) {
    const aile = new THREE.Group();
    aile.position.set(0, 1.0, -0.9);
    aile.rotation.z = cote * 0.04;
    const interieur = boite(3.2, 0.16, 1.15, matBlanc);
    interieur.position.set(cote * 1.6, 0, -0.225);
    const exterieur = boite(2.3, 0.14, 1.15, matBlanc);
    exterieur.position.set(cote * 4.35, 0, -0.225);
    aile.add(interieur, exterieur);

    const charniereVolet = new THREE.Group();
    charniereVolet.position.set(cote * 1.85, 0, 0.35);
    const volet = boite(2.7, 0.1, 0.45, matBlanc);
    volet.position.z = 0.225;
    charniereVolet.add(volet);
    aile.add(charniereVolet);
    pieces.volets.push(charniereVolet);

    const charniereAileron = new THREE.Group();
    charniereAileron.position.set(cote * 4.35, 0, 0.35);
    const aileron = boite(2.3, 0.1, 0.45, matRouge);
    aileron.position.z = 0.225;
    charniereAileron.add(aileron);
    aile.add(charniereAileron);
    pieces[cote < 0 ? 'aileronGauche' : 'aileronDroit'] = charniereAileron;

    const saumon = boite(0.25, 0.18, 1.6, matRouge);
    saumon.position.set(cote * 5.62, 0, 0);
    const feu = lumiere(cote < 0 ? 0xff2020 : 0x20ff40);
    feu.position.set(cote * 5.78, 0, -0.3);
    aile.add(saumon, feu);
    avion.add(aile);

    const hauban = boite(0.1, 2.52, 0.18, matBlanc);
    hauban.position.set(cote * 1.85, 0.34, -0.8);
    hauban.rotation.z = -cote * 0.986;
    avion.add(hauban);
  }

  // La queue
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

  const derive = new THREE.Group();
  derive.position.set(0, 0.75, 3.5);
  derive.rotation.x = 0.35;
  const plaqueDerive = boite(0.1, 1.7, 1.1, matRouge);
  plaqueDerive.position.y = 0.85;
  derive.add(plaqueDerive);
  collerLogo(derive, 1.1, 1.7, 0.056, 0.85, 0);
  const charniereDirection = new THREE.Group();
  charniereDirection.position.set(0, 0.85, 0.55);
  const direction = boite(0.08, 1.7, 0.45, matRouge);
  direction.position.z = 0.225;
  charniereDirection.add(direction);
  derive.add(charniereDirection);
  pieces.direction = charniereDirection;
  const gyrophare = lumiere(0xff2020);
  gyrophare.position.set(0, 1.75, 0.1);
  derive.add(gyrophare);
  pieces.gyrophare = gyrophare;
  avion.add(derive);

  const feuArriere = lumiere(0xffffff);
  feuArriere.position.set(0, remontee(fin), fin + 0.05);
  avion.add(feuArriere);

  // Le train d'atterrissage
  const roue = geoRoue(0.38, 0.22);
  const geoCarenage = new THREE.SphereGeometry(0.5, 12, 8);
  for (const cote of [-1, 1]) {
    const r = new THREE.Mesh(roue, matSombre);
    r.position.set(cote * 1.3, -1.45, -0.4);
    const carenage = new THREE.Mesh(geoCarenage, matRouge);
    carenage.scale.set(0.55, 0.75, 1.6);
    carenage.position.set(cote * 1.3, -1.33, -0.4);
    const jambe = boite(0.12, 1.1, 0.2, matBlanc);
    jambe.position.set(cote * 0.875, -1.1, -0.4);
    jambe.rotation.z = cote * 0.88;
    avion.add(r, carenage, jambe);
  }
  const roueAvant = new THREE.Mesh(roue, matSombre);
  roueAvant.position.set(0, -1.45, -3.0);
  const carenageAvant = new THREE.Mesh(geoCarenage, matRouge);
  carenageAvant.scale.set(0.45, 0.6, 1.3);
  carenageAvant.position.set(0, -1.35, -3.0);
  const jambeAvant = boite(0.12, 0.75, 0.12, matSombre);
  jambeAvant.position.set(0, -1.1, -3.0);
  avion.add(roueAvant, carenageAvant, jambeAvant);

  avion.userData = {
    pieces,
    hauteurRoues: 1.85,
    envergure: 11.5,
    longueur: 9,
    // On monte par la portière gauche, sous l'aile
    pointEmbarquement: new THREE.Vector3(-3, -1.85, -0.9),
  };
  return avion;
}

// ============================================================
//  2) ILYZGO AIR EXPRESS : le supersonique (comme le Concorde)
// ============================================================
function creerExpress(nom) {
  const avion = new THREE.Group();
  const pieces = { flammes: [], elevons: [] };
  const debut = -26;
  const fin = 22;
  const rayon = (z) => {
    if (z < -18) return 1.6 * Math.pow((z - debut) / 8, 0.7); // le long nez pointu
    if (z < 12) return 1.6;
    return 1.6 - 1.0 * ((z - 12) / 10);
  };
  const matBlanc = matiere(0xf8f9fa);
  const matGris = matiere(0xb8bec7);
  const matSombre = matiere(0x2b2b2b);
  const matRouge = matiere(CONFIG.couleurAvion);

  avion.add(fabriquerFuselage({
    debut, fin, rayon,
    peindre(o) {
      o.zone(0, 1, debut, fin, '#ffffff', false);
      o.zone(0, 0.08, debut, fin, '#d9dde3');
      o.zone(0.235, 0.25, -18, fin, CONFIG.couleurAvion2);       // bande bleue
      o.zone(0.252, 0.258, -18, fin, CONFIG.couleurAvion);       // filet rouge
      o.hublots(0.31, 0.335, -16, -2, 18, '#16324f');            // les hublots
      o.zone(0.43, 0.57, -18.6, -17.6, '#16324f', false);        // le cockpit
      o.ecrire(nom, 5.5, 0.30, 88, CONFIG.couleurAvion);         // le nom
    },
  }));
  const arriere = new THREE.Mesh(new THREE.CircleGeometry(rayon(fin), 16), matGris);
  arriere.position.z = fin;
  avion.add(arriere);

  // L'aile delta (en forme de triangle arrondi)
  const aile = aileAPlat([
    [0, -20], [2.2, -12], [5, -4], [9, 4], [12.5, 13], [12.5, 17],
    [-12.5, 17], [-12.5, 13], [-9, 4], [-5, -4], [-2.2, -12],
  ], 0.35, matBlanc);
  aile.position.y = -0.9;
  avion.add(aile);

  // Les gouvernes au bord arrière de l'aile (les "élevons")
  for (const x of [-9, -4, 4, 9]) {
    const charniere = new THREE.Group();
    charniere.position.set(x, -1.05, 17);
    const elevon = boite(4.5, 0.2, 1.6, matGris);
    elevon.position.z = 0.8;
    charniere.add(elevon);
    avion.add(charniere);
    pieces.elevons.push({ charniere, cote: Math.sign(x) });
  }

  // Les 4 réacteurs, deux sous chaque aile, avec la flamme de la post-combustion
  for (const cote of [-1, 1]) {
    const nacelle = boite(3.4, 1.3, 10, matGris);
    nacelle.position.set(cote * 4.2, -1.85, 13.5);
    const entree = boite(3.2, 1.1, 0.1, matSombre);
    entree.position.set(cote * 4.2, -1.85, 8.45);
    avion.add(nacelle, entree);
    for (const x of [3.4, 5.0]) {
      const tuyere = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 1, 12), matSombre);
      tuyere.rotation.x = Math.PI / 2;
      tuyere.position.set(cote * x, -1.85, 19);
      const flamme = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 4, 12),
        new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      flamme.rotation.x = Math.PI / 2;
      flamme.position.set(cote * x, -1.85, 21.5);
      avion.add(tuyere, flamme);
      pieces.flammes.push(flamme);
    }
  }

  // La grande dérive avec le logo
  const derive = deriveVerticale([[11, 1.2], [20.5, 1.2], [22, 10], [19, 10]], 0.3, matRouge);
  avion.add(derive);
  collerLogo(avion, 3.5, 3.5, 0.16, 5.6, 18.1);

  // Les lumières
  const feuGauche = lumiere(0xff2020, 0.2);
  feuGauche.position.set(-12.6, -1, 15);
  const feuDroit = lumiere(0x20ff40, 0.2);
  feuDroit.position.set(12.6, -1, 15);
  const gyrophare = lumiere(0xff2020, 0.2);
  gyrophare.position.set(0, 1.65, 0);
  avion.add(feuGauche, feuDroit, gyrophare);
  pieces.gyrophare = gyrophare;

  // Le train d'atterrissage, très haut
  const roue = geoRoue(0.55, 0.4);
  for (const cote of [-1, 1]) {
    const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.2, 8), matGris);
    jambe.position.set(cote * 3.5, -2.8, 7);
    const chariot = boite(0.3, 0.3, 2.2, matGris);
    chariot.position.set(cote * 3.5, -4.65, 7);
    avion.add(jambe, chariot);
    for (const dx of [-0.35, 0.35]) {
      for (const dz of [-0.8, 0.8]) {
        const r = new THREE.Mesh(roue, matSombre);
        r.position.set(cote * 3.5 + dx, -4.65, 7 + dz);
        avion.add(r);
      }
    }
  }
  const jambeAvant = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.0, 8), matGris);
  jambeAvant.position.set(0, -2.9, -14);
  avion.add(jambeAvant);
  for (const dx of [-0.3, 0.3]) {
    const r = new THREE.Mesh(roue, matSombre);
    r.position.set(dx, -4.65, -14);
    avion.add(r);
  }

  avion.userData = { pieces, hauteurRoues: 5.2, envergure: 25, longueur: 48 };
  ajouterEscalier(avion, new THREE.Vector3(-1.6, -0.3, -13), 5.2);
  return avion;
}

// ============================================================
//  3) ILYZGO AIR PASSENGERS : le géant à deux étages (comme le Boeing 747)
// ============================================================
function creerPassagers(nom) {
  const avion = new THREE.Group();
  const pieces = { reacteurs: [] };
  const debut = -27;
  const fin = 30;
  const rayon = (z) => {
    if (z < -20) return 3.0 * Math.sqrt((z - debut) / 7); // le nez arrondi
    if (z < 14) return 3.0;
    return 3.0 - 2.2 * ((z - 14) / 16);
  };
  const remontee = (z) => (z > 14 ? (z - 14) * 0.12 : 0);
  const matBlanc = matiere(0xffffff);
  const matGris = matiere(0xd5d9de);
  const matSombre = matiere(0x2b2b2b);
  const matRouge = matiere(CONFIG.couleurAvion);
  const matVitre = matiere(0x16324f, { roughness: 0.1, metalness: 0.5 });

  avion.add(fabriquerFuselage({
    debut, fin, rayon, remontee,
    peindre(o) {
      o.zone(0, 1, debut, fin, '#ffffff', false);
      o.zone(0, 0.12, debut, fin, '#d9dde3');                     // le ventre gris
      o.zone(0.2, 0.23, -22, fin, CONFIG.couleurAvion2);          // grande bande bleue
      o.zone(0.235, 0.245, -22, fin, CONFIG.couleurAvion);        // filet rouge
      o.hublots(0.285, 0.305, -21, 22, 64, '#16324f');            // les hublots
      o.zone(0.27, 0.32, -16.8, -15.4, '#9aa5b1');                // la porte avant
      o.ecrire(nom, 10, 0.36, 90, CONFIG.couleurAvion);           // le nom en grand
    },
  }));
  const arriere = new THREE.Mesh(new THREE.CircleGeometry(rayon(fin), 16), matGris);
  arriere.position.set(0, remontee(fin), fin);
  avion.add(arriere);

  // La "bosse" du pont supérieur, avec le cockpit et ses hublots
  const bosse = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), matBlanc);
  bosse.scale.set(2.3, 1.9, 12);
  bosse.position.set(0, 2.1, -13);
  avion.add(bosse);
  const cockpit = boite(1.8, 0.5, 0.8, matVitre);
  cockpit.position.set(0, 3.15, -22.6);
  cockpit.rotation.x = -0.5;
  avion.add(cockpit);
  for (let z = -20; z <= -6; z += 1.6) {
    const k = (z + 13) / 12;
    const demiLargeur = 2.3 * Math.sqrt(Math.max(0, 1 - k * k));
    for (const cote of [-1, 1]) {
      const hublot = boite(0.05, 0.35, 0.45, matVitre);
      hublot.position.set(cote * (demiLargeur - 0.02), 2.9, z);
      avion.add(hublot);
    }
  }

  // Les ailes en flèche, avec les 4 réacteurs
  for (const cote of [-1, 1]) {
    const groupe = new THREE.Group();
    groupe.position.set(0, -1.6, 0);
    groupe.rotation.z = cote * 0.07; // le dièdre
    const pointsAile = [[2.4, -7], [29, 11], [29, 14.5], [2.4, 5]].map(([x, z]) => [cote * x, z]);
    if (cote < 0) pointsAile.reverse();
    groupe.add(aileAPlat(pointsAile, 0.5, matGris));

    for (const x of [9, 18]) {
      const bordAvant = -7 + ((x - 2.4) / 26.6) * 18;
      const zc = bordAvant - 1.2;
      const reacteur = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.15, 5.5, 16), matBlanc);
      reacteur.rotation.x = Math.PI / 2;
      reacteur.position.set(cote * x, -1.9, zc);
      const entree = new THREE.Mesh(new THREE.CircleGeometry(1.0, 16), matSombre);
      entree.rotation.y = Math.PI;
      entree.position.set(cote * x, -1.9, zc - 2.76);
      const levre = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 6, 16), matRouge);
      levre.position.set(cote * x, -1.9, zc - 2.75);
      const ventilateur = new THREE.Group(); // les pales qui tournent
      ventilateur.position.set(cote * x, -1.9, zc - 2.6);
      for (let k = 0; k < 6; k++) {
        const pale = boite(0.18, 1.8, 0.05, matiere(0x777777));
        pale.rotation.z = (k * Math.PI) / 6;
        ventilateur.add(pale);
      }
      const mat = boite(0.4, 1.4, 3, matGris); // le mât qui tient le réacteur
      mat.position.set(cote * x, -0.9, zc + 0.5);
      groupe.add(reacteur, entree, levre, ventilateur, mat);
      pieces.reacteurs.push(ventilateur);
    }

    const feu = lumiere(cote < 0 ? 0xff2020 : 0x20ff40, 0.25);
    feu.position.set(cote * 29.2, -0.2, 12.5);
    groupe.add(feu);
    avion.add(groupe);
  }

  // La queue : stabilisateurs et grande dérive avec le logo
  for (const cote of [-1, 1]) {
    const points = [[1.0, 24.5], [11.5, 30], [11.5, 32], [1.0, 29.5]].map(([x, z]) => [cote * x, z]);
    if (cote < 0) points.reverse();
    const stab = aileAPlat(points, 0.3, matGris);
    stab.position.y = 1.9;
    avion.add(stab);
  }
  avion.add(deriveVerticale([[17, 2.5], [29.5, 2.5], [31.5, 15], [27, 15]], 0.4, matRouge));
  collerLogo(avion, 4.5, 4.5, 0.21, 9.5, 26.3);

  const gyrophare = lumiere(0xff2020, 0.25);
  gyrophare.position.set(0, 3.15, 4);
  avion.add(gyrophare);
  pieces.gyrophare = gyrophare;

  // Le train d'atterrissage : beaucoup de roues !
  const roue = geoRoue(0.75, 0.5);
  function chariot(x, z, yHaut) {
    const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, yHaut + 5.25, 8), matGris);
    jambe.position.set(x, (yHaut - 5.25) / 2, z);
    const poutre = boite(0.4, 0.4, 3, matGris);
    poutre.position.set(x, -5.25, z);
    avion.add(jambe, poutre);
    for (const dx of [-0.45, 0.45]) {
      for (const dz of [-0.95, 0.95]) {
        const r = new THREE.Mesh(roue, matSombre);
        r.position.set(x + dx, -5.25, z + dz);
        avion.add(r);
      }
    }
  }
  chariot(-2, 4, -2.5);
  chariot(2, 4, -2.5);
  chariot(-6.5, 2, -1.8);
  chariot(6.5, 2, -1.8);
  const jambeAvant = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.9, 8), matGris);
  jambeAvant.position.set(0, -3.8, -21);
  avion.add(jambeAvant);
  for (const dx of [-0.4, 0.4]) {
    const r = new THREE.Mesh(roue, matSombre);
    r.position.set(dx, -5.25, -21);
    avion.add(r);
  }

  avion.userData = { pieces, hauteurRoues: 6.0, envergure: 58, longueur: 57 };
  ajouterEscalier(avion, new THREE.Vector3(-3.0, -0.6, -16.1), 6.0);
  return avion;
}

// ============================================================
//  Fabrique l'avion choisi (une ligne de AVIONS dans config.js)
// ============================================================
export function creerModeleAvion(def) {
  const fabriques = { leger: creerLeger, express: creerExpress, passagers: creerPassagers };
  const avion = fabriques[def.id](def.nom);
  avion.scale.setScalar(def.taille);
  avion.userData.hauteurRoues *= def.taille;
  avion.userData.envergure *= def.taille;
  avion.userData.longueur *= def.taille;
  return avion;
}

// Fait bouger les pièces de l'avion : hélice, gouvernes, volets, réacteurs, lumières
// c = { gaz, virage, monter, volets, temps, gare }
export function animerModele(modele, c, dt) {
  const p = modele.userData.pieces;
  const doux = Math.min(1, dt * 8); // les gouvernes bougent en douceur
  const vers = (objet, axe, cible) => { objet.rotation[axe] += (cible - objet.rotation[axe]) * doux; };

  if (p.helice) {
    p.helice.rotation.z += dt * (4 + c.gaz * 45);
    p.disque.material.opacity = c.gaz * 0.25;
  }
  if (p.aileronGauche) {
    vers(p.aileronGauche, 'x', -c.virage * 0.4); // virage à gauche : aileron gauche monte
    vers(p.aileronDroit, 'x', c.virage * 0.4);   // … et aileron droit descend
    vers(p.profondeur, 'x', -c.monter * 0.4);
    vers(p.direction, 'y', -c.virage * 0.35);
  }
  if (p.volets) for (const volet of p.volets) vers(volet, 'x', c.volets ? 0.6 : 0);
  if (p.elevons) {
    for (const { charniere, cote } of p.elevons) vers(charniere, 'x', -c.monter * 0.3 + cote * c.virage * 0.3);
  }
  if (p.flammes) {
    // La post-combustion s'allume quand les gaz sont presque à fond
    const force = Math.max(0, (c.gaz - 0.7) / 0.3);
    for (const flamme of p.flammes) {
      flamme.material.opacity = force * (0.6 + Math.random() * 0.3);
      flamme.scale.y = 0.6 + force * 0.6;
    }
  }
  if (p.reacteurs) for (const v of p.reacteurs) v.rotation.z += dt * (2 + c.gaz * 25);
  if (p.escalier) p.escalier.visible = !!c.gare;
  if (p.gyrophare) p.gyrophare.material.emissiveIntensity = Math.sin(c.temps * 6) > 0.8 ? 4 : 0.2;
}
