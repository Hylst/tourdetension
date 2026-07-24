# Tour de Tension

**Jeu de Jenga 3D physique pour 2 joueurs.**

Joue sur : [games.hylst.fr/tourdetension/](https://games.hylst.fr/tourdetension/)

## Comment jouer
Chaque joueur retire un bloc de la tour et le replace au sommet. Si la tour tombe, tu perds !

## Controles
| Action | Souris | Tactile |
|--------|--------|---------|
| Rotation camera | Glisser | Glisser |
| Zoom | Molette | Pincer |
| Selectionner bloc | Cliquer | Toucher |
| Confirmer retrait | Bouton | Bouton |

## Structure
```
tourdetension/
├── src/
│   ├── App.tsx — Composant principal
│   ├── components/
│   │   ├── Tower.tsx — Rendu 3D tour + animations
│   │   ├── Scene.tsx — Scene 3D (lumieres, table, brouillard)
│   │   └── HUD.tsx — Interface utilisateur
│   ├── game/
│   │   ├── jenga.ts — Logique de jeu (tower, pull, stability)
│   │   ├── wood.ts — Texture bois procedurale
│   │   └── sound.ts — Audio procedurale
│   ├── main.tsx — Point d'entree
│   └── index.css — Styles Tailwind
├── index.html — Template HTML
├── package.json — Dependances
├── vite.config.ts — Config Vite
└── tsconfig.json — Config TypeScript
```

## Development
```bash
npm run dev    # Serveur de developpement
npm run build  # Build de production
```

## Credits
- Cree par Geoffroy Streit (alias Hylst)
- Creation assistee par IA
