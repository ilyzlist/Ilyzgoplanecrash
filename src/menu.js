// ============================================================
//  L'ÉCRAN DE DÉPART : on choisit son passeport, son pilote et son avion
//  Étapes : 1 Passeport → 2 Pilote → 3 Avion → 4 Embarquement
// ============================================================
import './menu.css';
import * as THREE from 'three';
import { AVIONS, PERSONNAGES, PASSEPORTS, CONFIG } from './config.js';
import { creerModeleAvion } from './modeles-avions.js';
import { creerFigurine } from './character.js';
import { htmlCouverture, htmlPageIdentite } from './passeport.js';

// ---------- Un petit appareil photo pour montrer les avions et les figurines ----------
function creerAppareilPhoto() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(400, 300);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x88aacc, 1.8));
  const soleil = new THREE.DirectionalLight(0xffffff, 2.2);
  soleil.position.set(-5, 8, -6);
  scene.add(soleil);
  const camera = new THREE.PerspectiveCamera(35, 4 / 3, 0.1, 2000);

  function prendre(objet, positionCamera, cible) {
    scene.add(objet);
    camera.position.copy(positionCamera);
    camera.lookAt(cible);
    renderer.render(scene, camera);
    const image = renderer.domElement.toDataURL('image/png');
    scene.remove(objet);
    return image;
  }

  return {
    // Une photo de tout l'objet, vu depuis une direction
    photo(objet, direction) {
      // On recule l'appareil juste assez pour que tout l'objet rentre dans la photo
      const sphere = new THREE.Box3().setFromObject(objet).getBoundingSphere(new THREE.Sphere());
      const recul = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.8;
      const position = sphere.center.clone().addScaledVector(direction.clone().normalize(), recul);
      return prendre(objet, position, sphere.center);
    },
    // Une photo d'identité (le visage de la figurine)
    portrait(figurine) {
      return prendre(figurine, new THREE.Vector3(0.5, 2.15, -2.6), new THREE.Vector3(0, 1.85, 0));
    },
    fermer() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

// Des étoiles pour les notes : ★★★☆☆
const etoiles = (n) => `<b>${'★'.repeat(n)}${'☆'.repeat(5 - n)}</b>`;

// Ouvre le menu. Renvoie (quand on a fini) : { passeport, perso, avion, portrait }
export function ouvrirMenu() {
  return new Promise((resolve) => {
    document.body.classList.add('menu-ouvert');

    // On prend les photos une seule fois
    const appareil = creerAppareilPhoto();
    const photos = { perso: {}, portrait: {}, avion: {} };
    for (const perso of PERSONNAGES) {
      const figurine = creerFigurine(perso);
      photos.perso[perso.id] = appareil.photo(figurine, new THREE.Vector3(0.45, 0.2, -1));
      photos.portrait[perso.id] = appareil.portrait(figurine);
    }
    for (const avion of AVIONS) {
      const modele = creerModeleAvion({ ...avion, taille: 1 });
      if (modele.userData.pieces.escalier) modele.userData.pieces.escalier.visible = false;
      photos.avion[avion.id] = appareil.photo(modele, new THREE.Vector3(-1, 0.5, -1.15));
    }
    appareil.fermer();

    // Ce qui est choisi (au départ : le premier de chaque liste)
    const choix = { passeport: PASSEPORTS[0], perso: PERSONNAGES[0], avion: AVIONS[0] };
    const nomsEtapes = ['Passeport', 'Pilote', 'Avion', 'Embarquement'];
    let etape = 0;

    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.innerHTML = `
      <header class="menu-entete">
        <div>
          <div class="menu-logo">✈️ ${CONFIG.nomIle}</div>
          <div class="menu-sous-titre">Fly Like the Wind · avec la compagnie ILYZGO AIR</div>
        </div>
        <ol class="etapes">${nomsEtapes.map((n, i) => `<li>${i + 1}. ${n}</li>`).join('')}</ol>
      </header>
      <main class="menu-contenu"></main>
      <footer class="menu-barre">
        <button class="retour">← Retour</button>
        <button class="suivant">Suivant →</button>
      </footer>`;
    document.body.appendChild(menu);
    const contenu = menu.querySelector('.menu-contenu');
    const boutonRetour = menu.querySelector('.retour');
    const boutonSuivant = menu.querySelector('.suivant');

    // Fabrique une rangée de cartes à choisir
    function cartes(liste, cle, dessinerCarte) {
      return `<div class="cartes">${liste.map((element) => `
        <button class="carte ${choix[cle] === element ? 'choisie' : ''}" data-cle="${cle}" data-id="${element.id}">
          ${dessinerCarte(element)}
        </button>`).join('')}</div>`;
    }

    function afficher() {
      menu.querySelectorAll('.etapes li').forEach((li, i) => {
        li.className = i === etape ? 'active' : i < etape ? 'faite' : '';
      });
      boutonRetour.hidden = etape === 0;
      boutonSuivant.textContent = etape === 3 ? "🛫 C'est parti !" : 'Suivant →';

      if (etape === 0) {
        contenu.innerHTML = `<h2>🛂 Choisis ton passeport</h2>` + cartes(PASSEPORTS, 'passeport', (p) => `
          ${htmlCouverture(p)}
          <div class="nom">${p.nom}</div>`);
      } else if (etape === 1) {
        contenu.innerHTML = `<h2>🧒 Choisis ton pilote</h2><div class="petites">` + cartes(PERSONNAGES, 'perso', (p) => `
          <img class="photo" src="${photos.perso[p.id]}" alt="">
          <div class="nom">${p.nom}</div>`) + `</div>
          <p class="recap">Les autres se promèneront sur l'île !</p>`;
      } else if (etape === 2) {
        contenu.innerHTML = `<h2>✈️ Choisis ton avion</h2>` + cartes(AVIONS, 'avion', (a) => `
          <img class="photo" src="${photos.avion[a.id]}" alt="">
          <div class="nom">${a.nom}</div>
          <div class="desc">${a.description}</div>
          <div class="etoiles">
            <span>Vitesse</span>${etoiles(a.etoiles.vitesse)}
            <span>Facilité</span>${etoiles(a.etoiles.facilite)}
            <span>Taille</span>${etoiles(a.etoiles.taille)}
          </div>`);
      } else {
        contenu.innerHTML = `
          <h2>🎫 Ton passeport est prêt !</h2>
          ${htmlPageIdentite({ ...choix, portrait: photos.portrait[choix.perso.id] })}
          <p class="recap">Pilote <b>${choix.perso.nom}</b> · Avion <b>${choix.avion.nom}</b><br>
          Passe le contrôle des passeports à l'aéroport, puis monte dans ton avion !</p>`;
      }

      // Quand on touche une carte, elle devient la carte choisie
      contenu.querySelectorAll('.carte').forEach((carte) => {
        carte.addEventListener('click', () => {
          const liste = { passeport: PASSEPORTS, perso: PERSONNAGES, avion: AVIONS }[carte.dataset.cle];
          choix[carte.dataset.cle] = liste.find((e) => e.id === carte.dataset.id);
          contenu.querySelectorAll(`.carte[data-cle="${carte.dataset.cle}"]`)
            .forEach((c) => c.classList.toggle('choisie', c === carte));
        });
      });
      contenu.scrollTop = 0;
    }

    boutonRetour.addEventListener('click', () => {
      etape = Math.max(0, etape - 1);
      afficher();
    });
    boutonSuivant.addEventListener('click', () => {
      if (etape < 3) {
        etape++;
        afficher();
        return;
      }
      // C'est parti !
      menu.remove();
      document.body.classList.remove('menu-ouvert');
      resolve({ ...choix, portrait: photos.portrait[choix.perso.id] });
    });

    afficher();
  });
}
