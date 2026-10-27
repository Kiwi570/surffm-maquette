# SURF FM + — maquette v1

Direction « Houle hertzienne ». Site statique (HTML, CSS, JavaScript), sans étape de construction, prêt pour Vercel.

## Pages
- `index.html` — Le direct (accueil)
- `emissions.html` — Émissions et grille
- `nous-capter.html` — FM, DAB+, web
- `mentions-legales.html` — à remplir par l'association

## À mettre à jour
- **Émissions, grille, agenda** : un seul fichier, `assets/js/data.js`. La grille actuelle est un exemple ; l'agenda trie seul les dates à venir et passées.
- **Flux audio** : le lecteur génère une ambiance de démonstration (`assets/js/player.js`). Avec l'adresse du flux réel (Icecast, RadioKing…), on remplace la démo par le vrai direct.
- **Mentions légales** : champs marqués « à compléter ».
- **Infos 2015** (102.3 FM saisonnière, équipe, émissions) : à confirmer avec la radio.

## Technique
- GSAP 3.15 (ScrollTrigger, SplitText), Lenis 1.3, OGL : hébergés dans `assets/vendor`.
- Polices hébergées (licence SIL Open Font) dans `assets/fonts`.
- Mode calme (bouton dans l'en-tête) et respect de « réduire les animations ». Version sans WebGL automatique (test : ajouter `?nowebgl` à l'adresse).
- Navigation sans rechargement : le son continue quand on change de page.
