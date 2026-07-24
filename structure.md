# Structure technique de Tour de Tension

```
build-physics-jenga-game-development/
├── index.html                    # Point d'entree HTML (SEO, meta tags, lang=fr)
├── package.json                  # Dependances (React 19, Three.js, R3F, Vite 7, Tailwind 4)
├── vite.config.ts                # Vite config (base: /tourdetension/, singlefile, tailwind, react)
├── tsconfig.json                 # TypeScript config
├── favicon.png                   # Favicon 32x32 (tour de blocs)
├── og-image.png                  # Open Graph 1024x576
├── about.md                      # A propos du jeu
├── README.md                     # Documentation utilisateur
├── structure.md                  # Ce fichier
├── features.md                   # Liste des fonctionnalites
├── todo.md                       # Roadmap et taches restantes
├── changelog.md                  # Historique des versions
├── .gitignore                    # Fichiers ignores
├── src/
│   ├── main.tsx                  # Point d'entree React
│   ├── index.css                 # Styles Tailwind CSS
│   ├── App.tsx                   # Composant principal (gestion d'etat, logique de jeu)
│   ├── components/
│   │   ├── Tower.tsx             # Rendu 3D de la tour et animations
│   │   ├── Scene.tsx             # Scene 3D (luminaires, table, brouillard, fond)
│   │   └── HUD.tsx              # Interface utilisateur (jauge de danger, noms, statut)
│   └── game/
│       ├── jenga.ts              # Logique de jeu (construction tour, retrait, stabilite)
│       ├── wood.ts               # Generation de texture bois procedurale (canvas)
│       └── sound.ts              # Moteur audio procedurale (Web Audio API)
└── dist/                         # Build de production (genere, ignore)
    ├── index.html                # Bundle single-file (React + Three.js inline)
    ├── favicon-BkiuuoOq.png      # Favicon hashe
    ├── favicon.png               # Favicon (copie)
    └── og-image.png              # OG image (copie)
```
