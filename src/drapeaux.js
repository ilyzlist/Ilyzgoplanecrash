// ============================================================
//  LES DRAPEAUX, dessinés dans une image (utilisés sur les passeports et devant l'aérogare)
// ============================================================

// Le drapeau d'ILYZGO : le ciel bleu, un soleil, une vague de vent et la mer turquoise
export function dessinerDrapeauIlyzgo(largeur = 300, hauteur = 200) {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const g = canvas.getContext('2d');
  const l = largeur;
  const h = hauteur;
  g.fillStyle = '#0f5e9c';                 // le ciel
  g.fillRect(0, 0, l, h);
  g.fillStyle = '#2ec4b6';                 // la mer
  g.fillRect(0, h * 0.68, l, h * 0.32);
  g.fillStyle = '#ffffff';                 // la plage
  g.fillRect(0, h * 0.64, l, h * 0.05);
  g.fillStyle = '#ffd400';                 // le soleil
  g.beginPath();
  g.arc(l * 0.22, h * 0.32, h * 0.16, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#ffffff';               // la vague de vent
  g.lineWidth = h * 0.06;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(l * 0.40, h * 0.42);
  g.bezierCurveTo(l * 0.55, h * 0.18, l * 0.70, h * 0.58, l * 0.90, h * 0.30);
  g.stroke();
  return canvas;
}

// Le drapeau européen : 12 étoiles jaunes en cercle sur fond bleu
export function dessinerDrapeauEurope(largeur = 300, hauteur = 200) {
  const canvas = document.createElement('canvas');
  canvas.width = largeur;
  canvas.height = hauteur;
  const g = canvas.getContext('2d');
  g.fillStyle = '#003399';
  g.fillRect(0, 0, largeur, hauteur);
  g.fillStyle = '#ffcc00';
  const rayon = hauteur / 3;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    dessinerEtoile(g, largeur / 2 + Math.cos(angle) * rayon, hauteur / 2 + Math.sin(angle) * rayon, hauteur / 18);
  }
  return canvas;
}

// Une étoile à 5 branches
export function dessinerEtoile(g, x, y, rayon) {
  g.beginPath();
  for (let k = 0; k < 10; k++) {
    const r = k % 2 === 0 ? rayon : rayon * 0.4;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
}
