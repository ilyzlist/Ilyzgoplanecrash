// ============================================================
//  RÉGLAGES DU JEU
//  Tu peux changer ces nombres pour modifier le jeu !
//  Sauvegarde le fichier et le jeu se recharge tout seul.
// ============================================================

export const CONFIG = {
  // --- Le départ ---
  departSurLaPiste: true,   // true = on commence posé sur la piste, false = en plein vol
  altitudeDepart: 60,       // hauteur de départ si on commence en vol

  // --- Le moteur et la vitesse ---
  vitesseMin: 15,           // vitesse avec le moteur coupé (en vol)
  vitesseMax: 80,           // vitesse avec le moteur à fond
  moteurDepart: 0.45,       // puissance du moteur si on commence en vol (0 = coupé, 1 = à fond)
  vitesseManette: 0.5,      // à quelle vitesse la manette des gaz bouge (Espace / Shift)
  reactiviteMoteur: 0.6,    // à quelle vitesse l'avion atteint la vitesse donnée par le moteur
  gravite: 18,              // en montée l'avion perd de la vitesse, en piqué il en gagne

  // --- Le pilotage ---
  vitesseRoulis: 1.6,       // à quelle vitesse l'avion penche (← / →)
  inclinaisonMax: 0.9,      // inclinaison maximum (0.9 ≈ 50 degrés)
  vitesseVirage: 1.4,       // plus l'avion penche, plus il tourne
  vitesseTangage: 0.9,      // à quelle vitesse le nez monte ou descend (↑ / ↓)
  retourHorizontal: 1.2,    // l'avion revient à plat tout seul quand on lâche les touches
  vitesseDecrochage: 22,    // en dessous de cette vitesse, l'avion "décroche" : le nez tombe
  vitesseDePalier: 42,      // en dessous de cette vitesse, les ailes portent moins : l'avion descend doucement
  descente: 0.4,            // à quelle vitesse il descend quand il est trop lent

  // --- Atterrissage et décollage ---
  vitesseAtterrissageMax: 48, // plus vite que ça, l'avion rebondit sur la piste
  vitesseDecollage: 32,       // vitesse minimum pour décoller (↓ quand on roule sur la piste)
  vitesseVirageSol: 0.8,      // pour tourner quand on roule au sol
  freinage: 15,               // force des freins (Shift quand on est au sol)
  hauteurRoues: 1.7,          // distance entre le centre de l'avion et le bas des roues

  // --- La caméra ---
  cameraDistance: 22,     // distance derrière l'avion
  cameraHauteur: 7,       // hauteur au-dessus de l'avion
  cameraSouplesse: 4,     // plus c'est grand, plus la caméra suit vite

  // --- L'île ---
  nombreMaisons: 8,       // nombre de maisons dans le village (30 au maximum)
  nombreArbres: 60,       // nombre d'arbres sur l'île
  tailleMonde: 3000,      // taille de la mer

  // --- Les couleurs ---
  couleurCiel: 0x8fd3ff,
  couleurMer: 0x2a9df4,
  couleurSable: 0xf4dc8a,
  couleurHerbe: 0x5cc85c,
  couleurRoche: 0x8a7f72,
  couleurNeige: 0xffffff,
  couleurPiste: 0x4a4a4a,
  couleurAvion: 0xff4f4f,
  couleurAilesAvion: 0xffffff,
  couleursMurs: [0xfff3d6, 0xffd6e0, 0xd6f0ff, 0xe8ffd6, 0xffe9b3],
  couleursToits: [0xd9534f, 0x3b7dd8, 0x8e5a3c, 0x2e8b57],
};
