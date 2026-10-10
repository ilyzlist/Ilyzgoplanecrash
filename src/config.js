// ============================================================
//  RÉGLAGES DU JEU
//  Tu peux changer ces nombres pour modifier le jeu !
//  Sauvegarde le fichier et le jeu se recharge tout seul.
//
//  Les vitesses sont en "unités par seconde".
//  Pour avoir des km/h, multiplie par 3,6 (exemple : 30 → 108 km/h).
// ============================================================

export const CONFIG = {
  // --- Le moteur et la vitesse (pour tous les avions) ---
  vitesseManette: 0.4,      // à quelle vitesse les gaz bougent quand on garde Espace / Shift
  gravite: 10,              // en montée l'avion perd de la vitesse, en piqué il en gagne

  // --- Le pilotage (pour tous les avions) ---
  inclinaisonMax: 0.8,      // inclinaison maximum (0.8 ≈ 45 degrés)
  vitesseTangage: 0.8,      // à quelle vitesse le nez monte ou descend (↑ / ↓)
  retourHorizontal: 1.2,    // l'avion revient à plat tout seul quand on lâche les touches
  descente: 0.4,            // à quelle vitesse il descend quand il est trop lent
  aerofreins: 6,            // F en vol : les volets sortent et freinent l'avion
  vitesseVirageSol: 0.8,    // pour tourner quand on roule au sol
  pentePAPI: 4.5,           // la bonne pente d'approche (en degrés) montrée par les lumières PAPI

  // --- Le personnage à pied ---
  vitesseMarche: 5,         // vitesse quand on marche
  vitesseCourse: 10,        // vitesse quand on court (Shift)
  forceSaut: 7,             // hauteur des sauts (Espace)
  distanceEmbarquement: 6,  // à quelle distance de la porte on peut monter dans l'avion (E)

  // --- La caméra ---
  cameraSouplesse: 4,       // plus c'est grand, plus la caméra suit vite
  cameraPietonDistance: 9,  // distance derrière le personnage
  cameraPietonHauteur: 4,   // hauteur au-dessus du personnage

  // --- L'île ---
  nomIle: 'ILYZGO COUNTRY', // écrit sur le grand panneau et en grosses lettres sur la montagne
  nomVille: 'ILYZGO CITY',  // le nouveau quartier à côté de l'aéroport
  nombreMaisons: 8,         // nombre de maisons dans le vieux village (30 au maximum)
  nombreMaisonsVille: 10,   // nombre de maisons à ILYZGO CITY
  nombreVoitures: 9,        // voitures garées sur le parking de l'aéroport
  nombreArbres: 160,        // arbres éparpillés sur l'île
  nombreArbresForet: 650,   // arbres dans la grande forêt d'ILYZGO
  nomEcole: "ÉCOLE D'ILYZGO",
  vitesseHabitants: 2.2,    // vitesse des autres personnages qui se promènent
  tailleMonde: 3000,        // taille de la mer

  // --- Les couleurs ---
  couleurCiel: 0x8fd3ff,
  couleurMer: 0x2a9df4,
  couleurSable: 0xf4dc8a,
  couleurHerbe: 0x5cc85c,
  couleurRoche: 0x8a7f72,
  couleurNeige: 0xffffff,
  couleurPiste: 0x3d3d3d,
  couleurAvion: '#e63946',        // rouge de la compagnie ILYZGO AIR
  couleurAvion2: '#1d4ed8',       // bleu de la compagnie
  couleursMurs: [0xfff3d6, 0xffd6e0, 0xd6f0ff, 0xe8ffd6, 0xffe9b3],
  couleursToits: [0xd9534f, 0x3b7dd8, 0x8e5a3c, 0x2e8b57],
  couleursVoitures: [0xe63946, 0x1d4ed8, 0xffbe0b, 0x2a9d8f, 0xffffff, 0x222222, 0x8338ec],
};

// ============================================================
//  LES AVIONS qu'on peut choisir au début du jeu
//  taille : 1 = taille normale du modèle
//  hauteurRoues : distance entre le centre de l'avion et le bas des roues (ne pas toucher)
// ============================================================
export const AVIONS = [
  {
    id: 'leger',
    nom: 'ILYZGO AIR',
    description: 'Le petit avion à hélice. Facile à piloter, parfait pour apprendre !',
    etoiles: { vitesse: 2, facilite: 5, taille: 1 },
    taille: 1.5,
    vitesseMin: 12, vitesseMax: 50,          // 43 à 180 km/h
    vitesseDecollage: 24,                    // 86 km/h
    vitesseAtterrissageMax: 32,              // 115 km/h
    vitesseDecrochage: 16, vitesseDePalier: 28,
    reactiviteMoteur: 0.8, vitesseRoulis: 1.4, vitesseVirage: 1.2, freinage: 12,
    cameraDistance: 30, cameraHauteur: 9,
  },
  {
    id: 'express',
    nom: 'ILYZGO AIR EXPRESS',
    description: 'Le supersonique à aile delta, inspiré du Concorde. Le plus rapide !',
    etoiles: { vitesse: 5, facilite: 2, taille: 3 },
    taille: 1,
    vitesseMin: 20, vitesseMax: 95,          // 72 à 342 km/h
    vitesseDecollage: 40,                    // 144 km/h
    vitesseAtterrissageMax: 50,              // 180 km/h
    vitesseDecrochage: 26, vitesseDePalier: 44,
    reactiviteMoteur: 0.6, vitesseRoulis: 1.6, vitesseVirage: 1.0, freinage: 16,
    cameraDistance: 70, cameraHauteur: 18,
  },
  {
    id: 'passagers',
    nom: 'ILYZGO AIR PASSENGERS',
    description: 'Le géant à 4 réacteurs et à deux étages, inspiré du Boeing 747. 400 passagers !',
    etoiles: { vitesse: 3, facilite: 3, taille: 5 },
    taille: 1,
    vitesseMin: 18, vitesseMax: 70,          // 65 à 252 km/h
    vitesseDecollage: 32,                    // 115 km/h
    vitesseAtterrissageMax: 42,              // 151 km/h
    vitesseDecrochage: 22, vitesseDePalier: 36,
    reactiviteMoteur: 0.35, vitesseRoulis: 0.8, vitesseVirage: 0.8, freinage: 10,
    cameraDistance: 90, cameraHauteur: 24,
  },
];

// ============================================================
//  LES PERSONNAGES (des figurines)
//  Tu peux changer leurs couleurs : t-shirt, short, peau, cheveux, chaussures…
//  coiffure : 'pointes', 'casquette', 'boucles', 'courts' ou 'longs'
//  lunettes : true pour mettre des lunettes
//  Les personnages qu'on ne choisit pas se promènent sur l'île.
// ============================================================
export const PERSONNAGES = [
  {
    id: 'ilyas', nom: 'Ilyas',
    tshirt: '#e63946', short: '#1d3557', peau: '#e8b98a', cheveux: '#1b1b1b', chaussures: '#ffffff',
    coiffure: 'pointes',
  },
  {
    id: 'lucas', nom: 'Lucas',
    tshirt: '#3a86ff', short: '#5c677d', peau: '#f6d5b8', cheveux: '#e9c46a', chaussures: '#222222',
    coiffure: 'casquette', casquette: '#ff7b00',
  },
  {
    id: 'mayol', nom: 'Mayol',
    tshirt: '#ffbe0b', short: '#2a9d8f', peau: '#c68b59', cheveux: '#3b2414', chaussures: '#e63946',
    coiffure: 'boucles',
  },
  // --- Les 5 nouveaux (tu peux changer leurs prénoms ici !) ---
  {
    id: 'adam', nom: 'Adam',
    tshirt: '#2a9d8f', short: '#264653', peau: '#f1c9a5', cheveux: '#2b1a0e', chaussures: '#ffffff',
    coiffure: 'courts', lunettes: true,
  },
  {
    id: 'noah', nom: 'Noah',
    tshirt: '#8338ec', short: '#3d405b', peau: '#d9a066', cheveux: '#5a3a1e', chaussures: '#ffbe0b',
    coiffure: 'pointes',
  },
  {
    id: 'yanis', nom: 'Yanis',
    tshirt: '#fb5607', short: '#1d3557', peau: '#c68b59', cheveux: '#111111', chaussures: '#ffffff',
    coiffure: 'casquette', casquette: '#3a86ff',
  },
  {
    id: 'leo', nom: 'Léo',
    tshirt: '#06d6a0', short: '#6c757d', peau: '#f6d5b8', cheveux: '#e9c46a', chaussures: '#3a86ff',
    coiffure: 'boucles',
  },
  {
    id: 'ines', nom: 'Inès',
    tshirt: '#ff70a6', short: '#5e60ce', peau: '#e8b98a', cheveux: '#3b2414', chaussures: '#ff70a6',
    coiffure: 'longs',
  },
];

// ============================================================
//  LES PASSEPORTS
// ============================================================
export const PASSEPORTS = [
  {
    id: 'europe',
    nom: 'Passeport européen',
    pays: 'UNION EUROPÉENNE',
    nationalite: 'Européenne',
    couleur: '#7b1e2b',
    accueil: 'Bienvenue à ILYZGO COUNTRY ! Bon séjour sur notre île 🌴',
  },
  {
    id: 'ilyzgo',
    nom: 'Passeport ILYZGO',
    pays: "RÉPUBLIQUE D'ILYZGO",
    nationalite: 'Ilyzgoise',
    couleur: '#0f5e9c',
    accueil: 'Bon retour à la maison, citoyen d\'ILYZGO ! 🏠',
  },
];
