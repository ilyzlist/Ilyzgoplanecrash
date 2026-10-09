// ============================================================
//  RÉGLAGES DU JEU
//  Tu peux changer ces nombres pour modifier le jeu !
//  Sauvegarde le fichier et le jeu se recharge tout seul.
// ============================================================

export const CONFIG = {
  // --- L'avion ---
  vitesseNormale: 40,     // vitesse de croisière (unités par seconde)
  vitesseMin: 20,         // vitesse quand on appuie sur Shift
  vitesseMax: 80,         // vitesse quand on appuie sur Espace
  acceleration: 30,       // à quelle vitesse l'avion change de vitesse
  vitesseVirage: 1.2,     // à quelle vitesse l'avion tourne (gauche/droite)
  vitesseTangage: 1.0,    // à quelle vitesse l'avion monte/descend
  inclinaisonMax: 0.6,    // combien l'avion penche dans les virages
  altitudeDepart: 60,     // hauteur de départ
  hauteurRebond: 4,       // distance minimum au-dessus du sol avant de rebondir

  // --- La caméra ---
  cameraDistance: 22,     // distance derrière l'avion
  cameraHauteur: 7,       // hauteur au-dessus de l'avion
  cameraSouplesse: 4,     // plus c'est grand, plus la caméra suit vite

  // --- Les couleurs ---
  couleurCiel: 0x8fd3ff,
  couleurMer: 0x2a9df4,
  couleurSable: 0xf4dc8a,
  couleurHerbe: 0x5cc85c,
  couleurRoche: 0x8a7f72,
  couleurNeige: 0xffffff,
  couleurAvion: 0xff4f4f,
  couleurAilesAvion: 0xffffff,

  // --- Le monde ---
  tailleMonde: 3000,      // taille de la mer
};
