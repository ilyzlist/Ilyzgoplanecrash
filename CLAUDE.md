# Fly Like the Wind ✈️🌬️

Jeu de vol en 3D dans le navigateur. On pilote un petit avion au-dessus d'un archipel, on apprend à utiliser le vent, puis on part à la recherche des débris d'un avion qui s'est écrasé, pour découvrir ce qui s'est passé.

**Ton : aventure et mystère, adapté aux enfants.** Pas de violence : le pilote de l'avion crashé s'est éjecté en parachute et il est sain et sauf. La dernière découverte du jeu, c'est de le retrouver.

---

## Boucle de jeu

### Phase 1 : « Fly like the wind » (apprentissage, ~3 min)
- Vol libre au-dessus de l'archipel (îles, mer, montagnes, quelques nuages).
- **Courants de vent** : des rubans de particules visibles dans le ciel. Voler *dans le sens* d'un courant donne un boost de vitesse. Voler à contre-courant ralentit.
- 5 **anneaux** à traverser en profitant des courants. Une fois tous les anneaux passés, un message radio arrive :
  > « Ici la tour. Un avion cargo a disparu des radars au-dessus des îles. Tu es le plus proche. Peux-tu aller voir ? »

### Phase 2 : la recherche
- Un **radar** (en bas de l'écran) bipe de plus en plus vite quand on approche d'un débris.
- Il y a **5 débris** à retrouver, dispersés sur les îles et dans la mer peu profonde : une aile, la queue, un moteur, une roue, une valise.
- Chaque débris trouvé débloque une **page du carnet de bord** du pilote, qui raconte l'histoire petit à petit (orage, panne d'un moteur, décision de s'éjecter…).
- Le **6e objet** est la **boîte noire** (orange). Elle n'apparaît que lorsque les 5 débris sont trouvés. Elle révèle la dernière position du pilote.

### Fin
- On vole jusqu'à une petite plage où le pilote fait des signaux avec une fusée éclairante. On fait un passage au-dessus de lui → écran de victoire : « Pilote retrouvé ! » + temps total + nombre de boosts de vent utilisés.

---

## Début de partie (déjà en place)
1. **Menu** (`src/menu.js`) : on choisit son **passeport** (européen ou ILYZGO), son **pilote** et son **avion**, puis on voit son passeport avec sa photo.
2. On arrive **à pied** devant l'aérogare de l'Aéroport international d'ILYZGO et on passe le **contrôle des passeports** (tampon d'entrée). C'est obligatoire avant de monter dans un avion.
3. On marche jusqu'à son avion garé sur le parking des avions (une flèche jaune montre où aller), on **monte** (E ou bouton MONTER), on roule jusqu'à la piste et on décolle.
4. Une fois arrêté au sol, on peut **descendre** (E ou bouton DESCENDRE) et se promener.
**Un avion sans pilote ne peut pas décoller** : gaz à 0 et freins serrés.

**Les noms (attention à l'orthographe !)** :
- Pays / île : **ILYZGO COUNTRY** · ville : **ILYZGO CITY** · supermarché : **ILYZGO MARKET**
- Pilotes : **Ilyas** (I-L-Y-A-S), **Lucas**, **Mayol** (les 3 premiers, des garçons) — à ne pas confondre avec ILYZGO (I-L-Y-Z-G-O). Puis 5 nouveaux aux prénoms provisoires choisis par Claude (Adam, Noah, Yanis, Léo, Inès), modifiables dans `config.js`. Les personnages non choisis se promènent sur l'île (`src/habitants.js`).
- **Statue d'Ilyas** : statue dorée géante sur la place du monument (à côté de la ville).
- Avions : **ILYZGO AIR** (petit avion à hélice), **ILYZGO AIR EXPRESS** (supersonique façon Concorde), **ILYZGO AIR PASSENGERS** (géant façon Boeing 747)
- Les avions, pilotes et passeports se règlent dans `config.js` (listes `AVIONS`, `PERSONNAGES`, `PASSEPORTS`).

## Contrôles (clavier)
| Touche | En avion | À pied |
|---|---|---|
| ↑ / ↓ | Piquer / cabrer (↓ sur la piste = décoller) | Avancer / reculer (aussi Z / S) |
| ← / → | Pencher pour tourner (au sol : tourner) | Tourner (aussi Q / D) |
| 0 à 9 | Régler les gaz directement (0 = coupé, 9 = 90 %) | — |
| Espace | Plus de gaz | Sauter |
| Shift | Moins de gaz | Courir |
| F | Freins au sol, volets en vol | — |
| E | Descendre de l'avion (arrêté au sol) | Monter dans l'avion (près de la porte) |
| B | — | Construire (puis 1-8 choisir, R tourner, Entrée poser, Échap) |
| M | Ouvrir le carnet de bord (à faire) | |

**Sur téléphone et tablette** (`src/touch.js`) : un manche à gauche (en avion : piquer / monter / pencher ; à pied : marcher), une manette des gaz et un bouton FREIN (VOLETS en vol) à droite en avion, un bouton SAUT à pied, et un bouton MONTER / DESCENDRE au milieu quand c'est possible. Les commandes sont semi-transparentes et **ne doivent jamais se chevaucher ni cacher le jeu** (vérifier en paysage ET en portrait). Le clavier doit toujours marcher en même temps.

L'île s'appelle **ILYZGO COUNTRY** (panneau de bienvenue près de la piste + grosses lettres sur la montagne). Elle a deux grandes parties :
- **Le côté aéroport et les constructions** : l'aéroport, **ILYZGO CITY** (supermarché ILYZGO MARKET, maisons, fontaine), le parking des voitures, la route, l'**École d'ILYZGO** (cour, terrain de foot, basket) et la **place du monument** (statue d'Ilyas). Le vieux village est à l'ouest de la piste.
- **La grande forêt d'ILYZGO** au nord-est : forêt dense (arbres dessinés avec `InstancedMesh` pour rester fluide), avec une clairière, la cabane du garde forestier et un feu de camp.

**Construire** (`src/construction.js`) : à pied, touche **B** ou bouton 🔨 → on choisit parmi 8 bâtiments (maison, boulangerie, café, glacier, pompiers, hôtel, aire de jeux, arbre) → aperçu transparent devant le personnage avec un cercle vert (possible) ou rouge (eau, pente, déjà occupé, piste/aéroport/route/monument/école) → **Entrée** / ✔ Poser, **R** / ↻ Tourner, **Échap** / ✖. Les constructions ne sont pas encore sauvegardées (elles disparaissent si on recharge la page).

Les vitesses s'affichent en km/h (vitesse du jeu × 3,6).

La physique est **un peu réaliste mais sans danger** : on tourne en penchant l'avion, Espace/Shift règlent une manette des gaz (qui reste en place), la gravité et la portance comptent, et l'avion peut décrocher s'il est trop lent. Mais il ne peut jamais s'écraser : s'il touche le sol ou l'eau ailleurs que sur la piste, il rebondit doucement vers le haut.

**Atterrissage** : sur la piste de l'île, si on arrive assez lentement et à plat, l'avion se pose, roule, freine (F) et peut redécoller (gaz + ↓).

---

## Stack technique
- **Vite + Three.js**, JavaScript (pas de TypeScript pour rester simple).
- **Aucun asset externe** : tout est construit en low-poly avec des formes Three.js (boîtes, cônes, cylindres), avec des couleurs vives et un rendu « flat shading ».
- Sons générés avec la Web Audio API (bips du radar, vent, petit jingle).
- Lancement : `npm install` puis `npm run dev`.

### Structure proposée
```
src/
  main.js        // scène, boucle de jeu, gestion des phases (à pied / en avion)
  config.js      // tous les réglages + listes des avions, pilotes, passeports
  menu.js        // écran de départ (passeport, pilote, avion) + menu.css
  passeport.js   // passeports et tampon d'entrée ; drapeaux.js : drapeaux ILYZGO / Europe
  controls.js    // clavier + tactile réunis
  touch.js       // commandes sur l'écran (téléphone / tablette)
  plane.js       // vol de l'avion + caméra qui suit
  modeles-avions.js // modèles 3D des 3 avions (+ escalier des gros avions)
  character.js   // figurines des pilotes, marche, saut
  world.js       // mer, île, piste, village, arbres, panneaux
  batiments.js   // aérogare, contrôle des passeports, parking, route, ILYZGO CITY, école, statue, cabane
  construction.js // le mode construction et les 8 bâtiments qu'on peut poser
  habitants.js   // les personnages non choisis qui se promènent
  wind.js        // courants de vent (particules + zone de boost)
  rings.js       // anneaux de la phase 1
  debris.js      // débris, boîte noire, détection de proximité
  radar.js       // radar HUD + bips
  logbook.js     // pages du carnet de bord (textes)
  ui.js          // HUD, messages radio, écrans titre/victoire
```

---

## Étapes de développement (dans cet ordre, tester à chaque fois)
1. Scène de base : ciel, mer, une île, un avion en cube qui vole avec les flèches, caméra qui suit.
2. Archipel (5–7 îles), nuages, physique arcade et rebond au sol.
3. Courants de vent + boost.
4. Anneaux + message radio → passage en phase 2.
5. Débris + radar + bips.
6. Carnet de bord + boîte noire.
7. Pilote, écran de victoire, écran titre.
8. Finitions : sons, effets visuels, petite mini-carte.

## Règles pour Claude Code
- Garder le code simple et bien commenté en français : un enfant doit pouvoir le lire et modifier des valeurs (vitesse, couleurs, nombre de débris).
- Mettre les réglages faciles à changer dans un fichier `src/config.js`.
- Faire une étape à la fois et vérifier que le jeu se lance avant de passer à la suivante.

## Hors périmètre (pour plus tard)
Multijoueur, plusieurs avions à choisir, manette de jeu, sauvegarde.
