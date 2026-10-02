// =========================================================
// Portfolio de Yann Madry
// 1. Thème clair / sombre      3. Mot qui change
// 2. Navigation et apparitions 4. Filtres des projets
//                              5. Adresse mail
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
const mots = ["des sites web", "des bases de données", "des logiciels de bureau", "des systèmes embarqués"];
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

function filtrer(domaine) {
  let nombre = 0;
  projets.forEach((projet) => {
    const visible = domaine === "tous" || projet.dataset.tags.split(" ").includes(domaine);
    projet.hidden = !visible;
    if (visible) {
      nombre++;
      projet.classList.add("visible");
    }
  });
  filtres.forEach((bouton) => bouton.setAttribute("aria-pressed", String(bouton.dataset.filtre === domaine)));
  compteProjets.textContent = domaine === "tous" ? "" : nombre + (nombre > 1 ? " projets" : " projet");
}

filtres.forEach((bouton) => {
  bouton.addEventListener("click", () => filtrer(bouton.dataset.filtre));
});

// Les quatre domaines de la présentation mènent aux projets, déjà filtrés
document.querySelectorAll(".domaine").forEach((lien) => {
  lien.addEventListener("click", () => filtrer(lien.dataset.filtre));
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
