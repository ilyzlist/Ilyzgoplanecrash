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

## Contrôles (clavier)
| Touche | Action |
|---|---|
| ↑ / ↓ | Piquer / cabrer |
| ← / → | Tourner (roulis + lacet simplifiés) |
| Espace | Accélérer |
| Shift | Ralentir |
| M | Ouvrir le carnet de bord |

La physique est **un peu réaliste mais sans danger** : on tourne en penchant l'avion, Espace/Shift règlent une manette des gaz (qui reste en place), la gravité et la portance comptent, et l'avion peut décrocher s'il est trop lent. Mais il ne peut jamais s'écraser : s'il touche le sol ou l'eau ailleurs que sur la piste, il rebondit doucement vers le haut.

**Atterrissage** : sur la piste de l'île, si on arrive assez lentement et à plat, l'avion se pose, roule, freine (Shift) et peut redécoller (gaz + ↓).

---

## Stack technique
- **Vite + Three.js**, JavaScript (pas de TypeScript pour rester simple).
- **Aucun asset externe** : tout est construit en low-poly avec des formes Three.js (boîtes, cônes, cylindres), avec des couleurs vives et un rendu « flat shading ».
- Sons générés avec la Web Audio API (bips du radar, vent, petit jingle).
- Lancement : `npm install` puis `npm run dev`.

### Structure proposée
```
src/
  main.js        // scène, boucle de jeu, gestion des phases
  plane.js       // modèle de l'avion + contrôles + caméra qui suit
  world.js       // mer, îles (bruit simple), nuages
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
Multijoueur, plusieurs avions à choisir, manette, version mobile, sauvegarde.
