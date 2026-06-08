# Handoff — Drop : 5 templates de mini-site

## Vue d'ensemble

Drop génère des **mini-sites éphémères** (auto-destruction à J+7) à partir d'une phrase. Un agent
choisit automatiquement **l'un des 5 formats**, rédige le contenu et génère **une image (fal.ai)**.
Ce paquet contient **5 designs de templates** (un par format) + une **galerie d'aperçu**.

Chaque template est une page autonome, responsive, en français, qui partage une **chrome Drop**
commune (header avec expiration vivante + footer d'auto-destruction) mais possède **son propre
univers visuel** (typographie, mise en page, mood, clair/sombre).

| # | Format | Mood | Fond | Accent défaut | Fichier |
|---|--------|------|------|---------------|---------|
| 01 | Guide pratique | pédagogue | clair | cyan `oklch(72% 0.13 196)` | `templates/Guide pratique.html` |
| 02 | Manifeste | tranché | sombre | corail `oklch(72% 0.16 32)` | `templates/Manifeste.html` |
| 03 | Étude de cas | preuve | clair | vert `oklch(58% 0.12 158)` | `templates/Étude de cas.html` |
| 04 | Quiz | ludique | sombre | violet `oklch(72% 0.16 305)` | `templates/Quiz.html` |
| 05 | Annonce | événement | sombre/poster | ambre `oklch(80% 0.15 75)` | `templates/Annonce.html` |

---

## À propos des fichiers de design

⚠️ **Les fichiers HTML de ce paquet sont des RÉFÉRENCES de design** — des prototypes montrant
l'apparence et le comportement voulus, **pas du code de production à copier tel quel**.

La tâche est de **recréer ces designs dans l'environnement existant de Drop** (d'après les vrais
drops, c'est **Next.js / React**, voir `getdrop.cloud`) en utilisant ses patterns, sa génération
de contenu et son moteur d'images. Concrètement : convertir chaque template en **composant React
paramétrable** qui reçoit le contenu généré (titre, sections, stat, liste, image fal.ai, CTA) et
une **couleur d'accent** choisie par l'utilisateur dans son dashboard.

## Fidélité

**Haute fidélité (hifi).** Couleurs, typographies, espacements et interactions sont définitifs.
Reproduire fidèlement. Toutes les valeurs exactes sont listées plus bas.

---

## Modèle de données commun (ce que l'agent doit fournir à chaque template)

Tous les formats consomment une structure proche. Champs communs :

```ts
type DropChrome = {
  author: string;          // "Marine Carité"
  authorTagline: string;   // "freelance augmenté IA"
  createdAt: Date;         // pour la barre de progression du temps restant
  expiresAt: Date;         // J+7 — header "Expire dans …" + footer "s'auto-détruit le …"
  accent: string;          // couleur d'accent choisie au dashboard (oklch/hex) → --accent
};

type DropImage = { url: string; alt: string };   // image unique générée par fal.ai
```

Champs spécifiques par format (voir chaque section). **Règle absolue : une seule image fal.ai
par template** (le placeholder `.imgph` marque son emplacement).

---

## La chrome Drop (commune aux 5)

### Header (sticky, `position:sticky; top:0`)
- Hauteur ~52px, fond `color-mix(in oklab, <bg> 80-84%, transparent)` + `backdrop-filter:blur(14px)`,
  bordure basse `--line`.
- **Gauche** : losange `◆` (`.dmark`) en `--accent` + `<b>Auteur</b> · tagline` en mono 13px.
- **Droite** : chip d'expiration — pastille qui pulse (`@keyframes pulse`, 2.4s) + texte
  `Expire dans <Xj Yh Zm>` en mono 12px, bordure `--line`, radius 999px.
- **Barre de progression** (`.progress > i`) sous le header : largeur = `(expiresAt - now) / (expiresAt - createdAt) * 100%`, dégradé accent. (Présente sur Guide/Manifeste/Étude ; optionnelle sur Quiz/Annonce.)

### Footer
- Bordure haute `--line`, contenu centré.
- `◆ Créé avec **Drop** · éphémère par nature`
- `Ce site s'auto-détruit le <date longue FR>` (mono, `--muted`, date en `--ink`).

### Le losange `.dmark` (pas un SVG)
```css
width:13px; height:13px; background:var(--accent);
border-radius:62% 62% 62% 8% / 62% 62% 78% 8%;
transform:rotate(45deg);
/* sur fond sombre : box-shadow:0 0 16px <accent/55%> */
```

### JS du compte à rebours (réutilisable)
```js
const target = expiresAt;                 // Date
const created = createdAt;                // Date
const total = target - created;
const pad = n => String(n).padStart(2,'0');
function tick(){
  const now = new Date(); let diff = Math.max(0, target - now);
  const d = Math.floor(diff/86400000); diff -= d*86400000;
  const h = Math.floor(diff/3600000);  diff -= h*3600000;
  const m = Math.floor(diff/60000);
  setText('[data-expire]', `${d}j ${pad(h)}h ${pad(m)}m`);
  const pct = Math.max(0, Math.min(100, (target-now)/total*100));
  setWidth('[data-expire-bar]', pct + '%');
  setText('[data-expire-date]', target.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}));
}
tick(); setInterval(tick, 20000);
```

---

## Design tokens

### Couleurs (toutes en oklch)
L'**accent** est une variable injectée par template (valeur par défaut ci-dessus, surchargée par le
choix dashboard). Chaque template définit aussi sa propre palette neutre :

**Guide pratique (clair)**
```
--accent:oklch(72% 0.13 196); --accent-deep:oklch(52% 0.12 210); --accent-wash:oklch(72% 0.13 196/.10);
--paper:oklch(98.5% 0.006 230); --paper-2:oklch(96% 0.01 230);
--ink:oklch(26% 0.03 250); --ink-soft:oklch(44% 0.03 250); --muted:oklch(60% 0.02 250); --line:oklch(89% 0.012 250);
```
**Manifeste (sombre)**
```
--accent:oklch(72% 0.16 32); --accent-soft:oklch(80% 0.12 40);
--bg:oklch(17% 0.012 40); --bg-2:oklch(21% 0.016 40); --card—n/a;
--ink:oklch(95% 0.012 60); --ink-soft:oklch(74% 0.02 50); --muted:oklch(56% 0.025 50); --line:oklch(32% 0.02 40);
```
**Étude de cas (clair)**
```
--accent:oklch(58% 0.12 158); --accent-deep:oklch(46% 0.11 160); --accent-wash:oklch(58% 0.12 158/.10);
--paper:oklch(99% 0.008 150); --paper-2:oklch(96.5% 0.012 155); --rose:oklch(62% 0.13 25);
--ink:oklch(24% 0.02 165); --ink-soft:oklch(42% 0.02 165); --muted:oklch(58% 0.018 165); --line:oklch(90% 0.012 160);
```
**Quiz (sombre)**
```
--accent:oklch(72% 0.16 305); --accent-2:oklch(70% 0.17 350);
--ok:oklch(74% 0.15 155); --no:oklch(66% 0.16 22);
--bg:oklch(17% 0.035 300); --bg-2:oklch(22% 0.045 300); --card:oklch(24% 0.05 300);
--ink:oklch(96% 0.012 300); --ink-soft:oklch(78% 0.03 300); --muted:oklch(60% 0.04 300); --line:oklch(34% 0.05 300);
```
**Annonce (sombre/poster)**
```
--accent:oklch(80% 0.15 75); --accent-2:oklch(72% 0.16 45);
--bg:oklch(18% 0.02 60); --bg-2:oklch(22% 0.028 60); --card:oklch(24% 0.03 60);
--ink:oklch(96% 0.02 80); --ink-soft:oklch(80% 0.03 75); --muted:oklch(62% 0.04 70); --line:oklch(34% 0.035 60);
```

### Typographie (Google Fonts)
| Rôle | Guide | Manifeste | Étude de cas | Quiz | Annonce |
|------|-------|-----------|--------------|------|---------|
| Display | Schibsted Grotesk 700 | **Bodoni Moda** 500 | Spectral 600 | Bricolage Grotesque 700-800 | **Anton** 400 |
| Corps | Newsreader | Newsreader | Archivo | Bricolage Grotesque | Hanken Grotesk |
| Labels/méta | JetBrains Mono | JetBrains Mono | JetBrains Mono | JetBrains Mono | JetBrains Mono |

- Eyebrows / labels : JetBrains Mono, ~12-13px, `letter-spacing:.14-.18em`, `text-transform:uppercase`, couleur accent.
- Chiffres (KPI, compte à rebours, score) : `font-variant-numeric:tabular-nums`.

### Espacement / surfaces
- Largeur contenu : Guide 1080 · Manifeste 1180 · Étude 1120 · Quiz 820 · Annonce 1140 px ; padding latéral 32-40px.
- Rayons : chips/expire 999px · boutons 11-14px · cartes 14-20px · images 14-16px.
- Sections : padding vertical 56-90px, séparées par bordures `--line`.

### ⚠️ Piège layout (important)
Les **grands titres en webfont** doivent être en **bloc pleine largeur** (`display:block; width:100%`),
**jamais en flex shrink-to-fit** : sinon, le temps que la webfont charge, le calcul de hauteur se fait
sur la police de secours (plus étroite) et le titre, une fois la vraie police peinte, déborde sur le
sous-titre. Pour les titres multi-lignes critiques, forcer les retours avec `<br>` + `&nbsp;` plutôt
que de compter sur le wrap automatique.

### ⚠️ Piège animation (important)
Toute animation d'entrée doit avoir son **état de repos = visible**. Ne jamais laisser un élément en
`opacity:0` via une keyframe persistante : si l'onglet est en arrière-plan (ou en export/capture),
l'animation reste figée à l'image 0 et le contenu devient invisible. Gabarit utilisé ici : animer
**uniquement** un léger `translateY`, sous `@media (prefers-reduced-motion: no-preference)`.

---

## Format 01 — Guide pratique (`templates/Guide pratique.html`)

**But** : expliquer étape par étape (modes d'emploi, « comment faire »).
**Données** : `title, lead, readingTime, steps[]` (chaque step : `title, paragraphs[], note?`), `image`, `cta`.

**Layout**
- Hero : eyebrow `Guide pratique · <thème>`, H1 `clamp(38-58px… )` *(voir piège bloc pleine largeur)*,
  `.lead` 24px `--ink-soft`, `.meta` (durée, nb étapes, mise à jour) en mono, puis **l'image fal.ai** (`.imgph`, 16:9).
- Corps : grille `220px 1fr` — **sommaire collant** (`position:sticky; top:96px`) à gauche, contenu à droite.
  - Le sommaire suit le scroll (scrollspy via IntersectionObserver, `rootMargin:'-30% 0px -60% 0px'`, classe `.on`).
  - Chaque section (`scroll-margin-top:96px`) : grand numéro accent (`.stepnum .big`), `<h2>`, paragraphes,
    encadré optionnel `.note` (bordure gauche accent + fond `--accent-wash`, label « À retenir »).
- Clôture : carte CTA `.cta` (fond `--paper-2`, bouton sombre → accent au hover).
- < 780px : sommaire masqué, grille 1 colonne.

**Équivalent produit** : reprendre la liste numérotée 01-05 des vrais drops + (optionnel) un bloc **Sondage**
(question à choix non scorée) avant le CTA.

---

## Format 02 — Manifeste (`templates/Manifeste.html`)

**But** : prendre position, marquer les esprits.
**Données** : `kicker, declaration (HTML, mot clé en <em> accent), standfirst, by, args[] (idx, h2, p), image, pullStat {num, caption}, closingQuote, sig, ctas[]`.

**Layout (sombre)**
- Hero : kicker mono, **déclaration** Bodoni `clamp(58-168px)`, `line-height:.92`, `letter-spacing:-.035em`,
  un mot en `<em>` italique accent ; `.standfirst` Newsreader italique `--ink-soft` ; ligne `by`.
- **Image fal.ai** : bande `.imgph` 21:9 juste après le hero.
- Arguments : 3 blocs `90px 1fr` — index romain italique accent (`I. II. III.`) + `<h2>` Bodoni + paragraphe.
- **Stat plein cadre** `.pull` : bordures haut/bas, `num` Bodoni `clamp(96-260px)` accent + caption mono.
  (Ex. réel : « 7 sur 10 ».)
- Clôture : `blockquote` Bodoni géant `clamp(40-92px)`, signature italique, 2 CTA (solide accent + ghost).

---

## Format 03 — Étude de cas (`templates/Étude de cas.html`)

**But** : montrer la preuve (avant/après, chiffres, résultat).
**Données** : `title, lead, clientMeta[] (k,v), image, kpis[] (big, lab, delta), sections[], beforeAfter {before[], after[]}, timeline[] (when, title, p), quote {text, author, role}, cta`.

**Layout (clair)**
- Hero : eyebrow, H1 *(bloc pleine largeur, `<br>` explicites)*, `.lead`, `.clientbar` (Profil / Durée / Objectif).
- **Image fal.ai** : bande `.imgph` 21:9 après le hero.
- **Rangée KPI** `.kpis` (3 col, fond `--line` 1px gap → bordures fines) : grand chiffre `--accent-deep`
  `font-variant-numeric:tabular-nums`, label, badge delta (`▲/▼`). Ex. réel : « −11h/sem ».
- Sections `.blk` séparées par `--line` : « Le point de départ », **Avant / Après** (2 cartes, la « after »
  teintée accent), **Timeline** semaine par semaine (`90px 1fr`), **citation** (avatar dégradé + nom/rôle).
- CTA final sur carte sombre `--ink`.
- < 740px : KPI / avant-après / timeline passent en 1 colonne.

---

## Format 04 — Quiz (`templates/Quiz.html`) — INTERACTIF

**But** : faire participer. **Vrai quiz à bonnes réponses** (pas un test de personnalité).
**Données** :
```ts
type Quiz = {
  title, intro, image,
  questions: { t:string; o:string[]; c:number; e:string }[], // c = index bonne réponse, e = explication
  tiers: { min:number; name:string; desc:string }[],          // paliers de score
  cta
};
```
**Machine à états** (3 panneaux : `intro` → `qpanel` → `result`)
1. **Intro** : eyebrow, titre (mot clé en dégradé accent→accent-2), intro, **image fal.ai** (16:9), méta, bouton « Lancer ».
2. **Question** (une à la fois) : barre de **dots** de progression (done/cur), **score courant** `Score N / total`,
   `<h2>`, 4 options `.opt` (touche A-D + libellé).
   - Au clic : on **verrouille**, on marque la bonne en vert (`--ok`, ✓), la choisie si fausse en rouge (`--no`, ✕),
     on grise les autres ; on affiche `.feedback` (bon/mauvais + explication `e`) ; bouton « Continuer / Voir mon score ».
   - Incrémenter `score` si bonne réponse.
3. **Résultat** : `score / total` géant (dégradé), **palier** (`tiers.find(t => score >= t.min)`) → nom + description, CTA + rejouer.

**États clés** : `idx` (question courante), `score`, `locked` (anti double-clic).
**Couleurs feedback** : `--ok:oklch(74% 0.15 155)`, `--no:oklch(66% 0.16 22)` (fonds via `color-mix` avec `--card`).
Le vrai produit peut aussi embarquer **une seule question** dans un format éditorial (cf. exemple `haut-coton-parme`).

---

## Format 05 — Annonce (`templates/Annonce.html`) — COMPTE À REBOURS

**But** : créer l'événement (date, promo, rareté, action).
**Données** : `tags[], title (HTML, mot en <span class=am> accent), subtitle, image, event {datetime, place}, countdownTarget, programme[] (time, title, p), infos[] (k,v), scarcity {left, total}, finalTitle, cta`.

**Layout (poster sombre)**
- Poster : `.tagrow` (Événement · … · Places limitées), **titre Anton** `clamp(64-184px)` uppercase
  (un mot en accent), `.psub`, **image fal.ai** `.imgph` 21:9.
- **Bande date** `.band` (bordures haut/bas 2px) : `<jour> <date>` Anton (accent sur le jour) + heure + lieu mono.
- **Compte à rebours** `.clock` : 4 `.unit` (JJ/HH/MM/SS), chiffres Anton accent `tabular-nums`, **maj chaque seconde**.
  Cible dynamique = `now + 8j` à 18h30 (toujours futur) ; le jour/date affichés sont dérivés de la cible.
- CTA solide + **rareté** : barre de jauge + « Plus que N places sur M ».
- « Au programme » (`.prog`, 2 col, horaires accent), « Infos pratiques » (`.infos`, 4 cartes), CTA final Anton.
- < 760px : programme/infos en 1-2 colonnes.

---

## Galerie d'aperçu (`Galerie de templates.html`)

Index (aesthetic Drop : sombre, cyan, Space Grotesk). Grille 2 colonnes de cartes ; chaque carte =
**aperçu live** (iframe du template, mis à l'échelle par JS : `scale = shot.clientWidth/1280`,
hauteur = `840*scale`), nom du format, pastille couleur, description, features, lien « Ouvrir ».
Utile comme écran de **sélection de template** dans le dashboard.

---

## Interactions & comportements (récap)
- **Compte à rebours expiration** : maj toutes les 20s ; barre de progression du temps restant.
- **Compte à rebours événement (Annonce)** : maj chaque seconde, 4 unités.
- **Scrollspy sommaire (Guide)** : IntersectionObserver, surlignage de l'entrée active.
- **Quiz** : verrouillage au clic, feedback couleur + explication, score cumulé, paliers de résultat, rejouer.
- **Hovers** : boutons `translateY(-2px)` + glow accent ; cartes galerie `translateY(-4px)` + ombre teintée.
- **Responsive** : breakpoint principal ~740-880px selon template (grilles → 1 colonne).
- **prefers-reduced-motion** : désactive pulse / entrées / spin décoratifs.

## Assets
- **Aucune image bundlée.** Chaque template a **un seul** emplacement image (`.imgph`) = photo générée
  par **fal.ai** côté produit. Le placeholder (hachures diagonales + icône + label « Image · générée par
  fal.ai ») doit être remplacé par `<img>`/`next/image` avec l'URL fal.ai.
- Icônes : SVG inline (icône image dans le placeholder). Polices : Google Fonts (voir tableau).
- Le losange Drop est en CSS pur (pas d'asset).

## Fichiers de ce paquet
- `templates/Guide pratique.html`
- `templates/Manifeste.html`
- `templates/Étude de cas.html`
- `templates/Quiz.html`
- `templates/Annonce.html`
- `Galerie de templates.html` (index / sélecteur)
