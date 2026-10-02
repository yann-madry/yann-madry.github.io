// =========================================================
// Portfolio de Yann Madry
// 1. Thème clair / sombre      4. Filtres des projets
// 2. Navigation et apparitions 5. Adresse mail
// 3. Mot qui change            6. Mini-jeu Pong
// =========================================================

const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- 1. Thème clair / sombre ----------
const racine = document.documentElement;
const boutonTheme = document.querySelector(".bascule-theme");

function themeActuel() {
  if (racine.dataset.theme) return racine.dataset.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

boutonTheme.addEventListener("click", () => {
  const nouveau = themeActuel() === "dark" ? "light" : "dark";
  racine.dataset.theme = nouveau;
  try { localStorage.setItem("theme", nouveau); } catch (e) { /* stockage indisponible */ }
});

// ---------- 2. Navigation et apparitions ----------
// Les blocs .revele apparaissent quand ils entrent dans l'écran
const observateurApparition = new IntersectionObserver((entrees) => {
  for (const entree of entrees) {
    if (entree.isIntersecting) {
      entree.target.classList.add("visible");
      observateurApparition.unobserve(entree.target);
    }
  }
}, { threshold: 0.12 });
document.querySelectorAll(".revele").forEach((bloc) => observateurApparition.observe(bloc));

// Le lien de la section affichée est mis en avant dans le menu
const liensMenu = new Map();
document.querySelectorAll(".entete nav a").forEach((lien) => liensMenu.set(lien.getAttribute("href").slice(1), lien));

const observateurSection = new IntersectionObserver((entrees) => {
  for (const entree of entrees) {
    if (!entree.isIntersecting) continue;
    liensMenu.forEach((lien, id) => {
      if (id === entree.target.id) lien.setAttribute("aria-current", "true");
      else lien.removeAttribute("aria-current");
    });
  }
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach((section) => observateurSection.observe(section));

// ---------- 3. Mot qui change dans l'accroche ----------
const mots = ["logiciel de bureau", "systèmes embarqués", "sites web"];
const motAffiche = document.querySelector(".rotation-mot");
let indexMot = 0;

if (!mouvementReduit) {
  setInterval(() => {
    motAffiche.classList.add("sort");
    setTimeout(() => {
      indexMot = (indexMot + 1) % mots.length;
      motAffiche.textContent = mots[indexMot];
      motAffiche.classList.remove("sort");
    }, 350);
  }, 2600);
}

// ---------- 4. Filtres des projets ----------
const filtres = document.querySelectorAll(".filtre");
const projets = document.querySelectorAll(".projet");
const compteProjets = document.querySelector(".filtres-compte");

function filtrer(tag) {
  let nombre = 0;
  projets.forEach((projet) => {
    const visible = tag === "tous" || projet.dataset.tags.split(" ").includes(tag);
    projet.hidden = !visible;
    if (visible) {
      nombre++;
      projet.classList.add("visible");
    }
  });
  compteProjets.textContent = tag === "tous" ? "" : nombre + (nombre > 1 ? " projets" : " projet");
}

filtres.forEach((bouton) => {
  bouton.addEventListener("click", () => {
    filtres.forEach((autre) => autre.setAttribute("aria-pressed", String(autre === bouton)));
    filtrer(bouton.dataset.filtre);
  });
});

// ---------- 5. Adresse mail ----------
// L'adresse est assemblée ici pour ne pas être lue telle quelle par les robots
const lienMail = document.querySelector(".mail");
const boutonCopier = document.querySelector(".copier");
const messageCopie = document.querySelector(".copie-ok");
const adresse = lienMail.dataset.utilisateur + "@" + lienMail.dataset.domaine;

lienMail.textContent = adresse;
lienMail.href = "mailto:" + adresse;

if (navigator.clipboard) {
  boutonCopier.hidden = false;
  boutonCopier.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(adresse);
      messageCopie.textContent = "Adresse copiée";
    } catch (e) {
      messageCopie.textContent = "Copie impossible";
    }
    setTimeout(() => { messageCopie.textContent = ""; }, 2500);
  });
}

// ---------- 6. Mini-jeu Pong ----------
// L'écran fait 128 × 64 pixels, comme l'écran OLED du projet sur ESP32.
const toile = document.getElementById("pong");
const dessin = toile.getContext("2d");
const aide = document.getElementById("pong-aide");
const boutonPause = document.getElementById("pong-pause");

const LARGEUR = 128, HAUTEUR = 64;
const RAQUETTE_H = 14, RAQUETTE_L = 2, BALLE = 2;
const X_GAUCHE = 4, X_DROITE = LARGEUR - 4 - RAQUETTE_L;
const VITESSE_DEPART = 0.9, VITESSE_MAX = 2.3;
const BLANC = "#eaf2ff";

// Chiffres du score : 3 pixels de large sur 5 de haut
const CHIFFRES = [
  "111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
  "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111",
];

const sourisPrecise = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const jeu = {
  gauche: HAUTEUR / 2 - RAQUETTE_H / 2,
  droite: HAUTEUR / 2 - RAQUETTE_H / 2,
  balle: { x: 0, y: 0, vx: 0, vy: 0 },
  score: [0, 0],
  joueurActif: false,   // faux : les deux raquettes jouent toutes seules
  cibleJoueur: HAUTEUR / 2,
  derniereAction: 0,
  attente: 0,           // images à attendre avant le service
};

function servir(versLaDroite) {
  jeu.balle.x = LARGEUR / 2 - BALLE / 2;
  jeu.balle.y = HAUTEUR / 2 - BALLE / 2;
  jeu.balle.vx = versLaDroite ? VITESSE_DEPART : -VITESSE_DEPART;
  jeu.balle.vy = (Math.random() - 0.5) * 1.2;
  jeu.attente = 40;
}

function borner(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

// Raquette automatique : elle suit la balle quand celle-ci vient vers elle
function suivre(position, vitesse, balleArrive) {
  const cible = balleArrive ? jeu.balle.y - RAQUETTE_H / 2 + BALLE / 2 : HAUTEUR / 2 - RAQUETTE_H / 2;
  const ecart = cible - position;
  return borner(position + borner(ecart, -vitesse, vitesse), 0, HAUTEUR - RAQUETTE_H);
}

function rebondir(yRaquette, sens) {
  const balle = jeu.balle;
  const impact = (balle.y + BALLE / 2 - (yRaquette + RAQUETTE_H / 2)) / (RAQUETTE_H / 2);
  const vitesse = Math.min(Math.abs(balle.vx) * 1.06, VITESSE_MAX);   // la balle accélère à chaque échange
  balle.vx = vitesse * sens;
  balle.vy = borner(balle.vy + impact * 0.7, -1.6, 1.6);
}

function avancer() {
  const balle = jeu.balle;

  // Raquettes
  if (jeu.joueurActif) {
    const ecart = jeu.cibleJoueur - RAQUETTE_H / 2 - jeu.gauche;
    jeu.gauche = borner(jeu.gauche + borner(ecart, -2.4, 2.4), 0, HAUTEUR - RAQUETTE_H);
  } else {
    jeu.gauche = suivre(jeu.gauche, 1.05, balle.vx < 0);
  }
  jeu.droite = suivre(jeu.droite, 1.0, balle.vx > 0);

  if (jeu.attente > 0) { jeu.attente--; return; }

  // Balle
  balle.x += balle.vx;
  balle.y += balle.vy;

  if (balle.y <= 0) { balle.y = 0; balle.vy = Math.abs(balle.vy); }
  if (balle.y >= HAUTEUR - BALLE) { balle.y = HAUTEUR - BALLE; balle.vy = -Math.abs(balle.vy); }

  const toucheGauche = balle.vx < 0 && balle.x <= X_GAUCHE + RAQUETTE_L && balle.x >= X_GAUCHE - 2
    && balle.y + BALLE >= jeu.gauche && balle.y <= jeu.gauche + RAQUETTE_H;
  const toucheDroite = balle.vx > 0 && balle.x + BALLE >= X_DROITE && balle.x + BALLE <= X_DROITE + RAQUETTE_L + 2
    && balle.y + BALLE >= jeu.droite && balle.y <= jeu.droite + RAQUETTE_H;

  if (toucheGauche) { balle.x = X_GAUCHE + RAQUETTE_L; rebondir(jeu.gauche, 1); }
  if (toucheDroite) { balle.x = X_DROITE - BALLE; rebondir(jeu.droite, -1); }

  // Point marqué
  if (balle.x < -BALLE) { marquer(1); }
  if (balle.x > LARGEUR) { marquer(0); }
}

function marquer(camp) {
  jeu.score[camp]++;
  if (jeu.score[0] > 9 || jeu.score[1] > 9) jeu.score = [0, 0];
  servir(camp === 0);
}

function dessinerChiffre(chiffre, x, y) {
  const points = CHIFFRES[chiffre];
  for (let i = 0; i < 15; i++) {
    if (points[i] === "1") dessin.fillRect(x + (i % 3), y + Math.floor(i / 3), 1, 1);
  }
}

function dessiner() {
  dessin.fillStyle = "#000";
  dessin.fillRect(0, 0, LARGEUR, HAUTEUR);
  dessin.fillStyle = BLANC;

  for (let y = 1; y < HAUTEUR; y += 4) dessin.fillRect(LARGEUR / 2, y, 1, 2);   // filet
  dessinerChiffre(jeu.score[0], LARGEUR / 2 - 9, 3);
  dessinerChiffre(jeu.score[1], LARGEUR / 2 + 7, 3);

  dessin.fillRect(X_GAUCHE, Math.round(jeu.gauche), RAQUETTE_L, RAQUETTE_H);
  dessin.fillRect(X_DROITE, Math.round(jeu.droite), RAQUETTE_L, RAQUETTE_H);
  dessin.fillRect(Math.round(jeu.balle.x), Math.round(jeu.balle.y), BALLE, BALLE);
}

// Boucle de jeu : 60 étapes par seconde, quel que soit l'écran
let enPause = mouvementReduit;
let ecranVisible = true;
let dernierTemps = 0;
let reste = 0;
const PAS = 1000 / 60;

function boucle(temps) {
  requestAnimationFrame(boucle);
  const ecoule = Math.min(temps - dernierTemps, 100);
  dernierTemps = temps;
  if (enPause || !ecranVisible || document.hidden) return;

  // Sans action depuis 4 secondes, la démonstration automatique reprend
  if (jeu.joueurActif && temps - jeu.derniereAction > 4000) {
    jeu.joueurActif = false;
    aide.textContent = "Passe la souris sur l'écran pour jouer";
  }

  reste += ecoule;
  while (reste >= PAS) { avancer(); reste -= PAS; }
  dessiner();
}

function prendreLaMain() {
  jeu.joueurActif = true;
  jeu.derniereAction = performance.now();
  aide.textContent = "À toi de jouer : raquette de gauche";
}

if (sourisPrecise) {
  toile.addEventListener("pointermove", (evenement) => {
    const cadre = toile.getBoundingClientRect();
    jeu.cibleJoueur = ((evenement.clientY - cadre.top) / cadre.height) * HAUTEUR;
    prendreLaMain();
  });
} else {
  aide.textContent = "Démonstration automatique";
}

toile.addEventListener("keydown", (evenement) => {
  if (evenement.key !== "ArrowUp" && evenement.key !== "ArrowDown") return;
  evenement.preventDefault();
  if (!jeu.joueurActif) jeu.cibleJoueur = jeu.gauche + RAQUETTE_H / 2;
  jeu.cibleJoueur = borner(jeu.cibleJoueur + (evenement.key === "ArrowUp" ? -7 : 7), 0, HAUTEUR);
  prendreLaMain();
});

boutonPause.addEventListener("click", () => {
  enPause = !enPause;
  boutonPause.textContent = enPause ? "Lecture" : "Pause";
  boutonPause.setAttribute("aria-pressed", String(enPause));
});
if (enPause) {
  boutonPause.textContent = "Lecture";
  boutonPause.setAttribute("aria-pressed", "true");
}

// Le jeu s'arrête quand il n'est plus à l'écran
new IntersectionObserver((entrees) => { ecranVisible = entrees[0].isIntersecting; }).observe(toile);

servir(true);
dessiner();
requestAnimationFrame(boucle);
