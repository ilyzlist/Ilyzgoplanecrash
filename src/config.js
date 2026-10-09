// ============================================================
//  RÉGLAGES DU JEU
//  Tu peux changer ces nombres pour modifier le jeu !
//  Sauvegarde le fichier et le jeu se recharge tout seul.
//
//  Les vitesses sont en "unités par seconde".
//  Pour avoir des km/h, multiplie par 3,6 (exemple : 30 → 108 km/h).
// ============================================================

export const CONFIG = {
  // --- L'avion ---
  nomAvion: 'ILYZGO AIR',   // le nom peint sur l'avion
  tailleAvion: 1.5,         // 1 = petit avion, 1.5 = plus grand, 2 = très grand

  // --- Le départ ---
  departSurLaPiste: true,   // true = on commence posé sur la piste, false = en plein vol
  altitudeDepart: 60,       // hauteur de départ si on commence en vol

  // --- Le moteur et la vitesse ---
  vitesseMin: 12,           // vitesse avec les gaz coupés (en vol)       → 43 km/h
  vitesseMax: 50,           // vitesse avec les gaz à fond                → 180 km/h
  gazDepart: 0.5,           // gaz au départ si on commence en vol (0 = coupé, 1 = à fond)
  vitesseManette: 0.4,      // à quelle vitesse les gaz bougent quand on garde Espace / Shift
  reactiviteMoteur: 0.8,    // à quelle vitesse l'avion atteint la vitesse donnée par les gaz
  gravite: 10,              // en montée l'avion perd de la vitesse, en piqué il en gagne

  // --- Le pilotage ---
  vitesseRoulis: 1.4,       // à quelle vitesse l'avion penche (← / →)
  inclinaisonMax: 0.8,      // inclinaison maximum (0.8 ≈ 45 degrés)
  vitesseVirage: 1.2,       // plus l'avion penche, plus il tourne
  vitesseTangage: 0.8,      // à quelle vitesse le nez monte ou descend (↑ / ↓)
  retourHorizontal: 1.2,    // l'avion revient à plat tout seul quand on lâche les touches
  vitesseDecrochage: 16,    // en dessous, l'avion "décroche" : le nez tombe          → 58 km/h
  vitesseDePalier: 28,      // en dessous, l'avion descend doucement (il porte moins)  → 100 km/h
  descente: 0.4,            // à quelle vitesse il descend quand il est trop lent
  aerofreins: 6,            // F en vol : les volets sortent et freinent l'avion

  // --- Atterrissage et décollage ---
  vitesseAtterrissageMax: 32, // plus vite que ça, l'avion rebondit sur la piste    → 115 km/h
  vitesseDecollage: 24,       // vitesse pour décoller (↓ quand on roule sur la piste) → 86 km/h
  vitesseVirageSol: 0.8,      // pour tourner quand on roule au sol
  freinage: 12,               // force des freins (F quand on est au sol)
  pentePAPI: 4.5,             // la bonne pente d'approche (en degrés) montrée par les lumières PAPI

  // --- La caméra ---
  cameraDistance: 30,     // distance derrière l'avion
  cameraHauteur: 9,       // hauteur au-dessus de l'avion
  cameraSouplesse: 4,     // plus c'est grand, plus la caméra suit vite

  // --- L'île ---
  nomIle: 'ILYZGO COUNTRY', // écrit sur le grand panneau et en grosses lettres sur la montagne
  nombreMaisons: 8,       // nombre de maisons dans le village (30 au maximum)
  nombreArbres: 80,       // nombre d'arbres sur l'île
  tailleMonde: 3000,      // taille de la mer

  // --- Les couleurs ---
  couleurCiel: 0x8fd3ff,
  couleurMer: 0x2a9df4,
  couleurSable: 0xf4dc8a,
  couleurHerbe: 0x5cc85c,
  couleurRoche: 0x8a7f72,
  couleurNeige: 0xffffff,
  couleurPiste: 0x3d3d3d,
  couleurAvion: '#e63946',        // rouge de la livrée ILYZGO AIR
  couleurAvion2: '#1d4ed8',       // bleu du filet sous la bande rouge
  couleursMurs: [0xfff3d6, 0xffd6e0, 0xd6f0ff, 0xe8ffd6, 0xffe9b3],
  couleursToits: [0xd9534f, 0x3b7dd8, 0x8e5a3c, 0x2e8b57],
};

// Calculé tout seul (ne pas toucher) : la hauteur des roues dépend de la taille de l'avion
CONFIG.hauteurRoues = 1.85 * CONFIG.tailleAvion;
