# Changelog Tour de Tension

## [1.1.0] 2026-08-03

### Ajoute
- Bouton « Comment ce jeu a ete fait » sur l'ecran de menu, ouvrant une modale avec la
  stack, les graphismes, la musique, les interactions, l'architecture et les algorithmes
  notables (modele d'instabilite base sur la largeur/centrage du support, tension
  progressive). Etape 15 du chantier de retrofit decrit dans `todo.md` racine du monorepo.

### Corrige
- 4 tirets longs (un libelle d'interface, trois commentaires de code en anglais) remplaces
  par des deux-points ou points-virgules, en conformite avec la regle du depot.

### Verifie
- Build propre, modale testee a l'ouverture/fermeture, aucune erreur console, aucun 404
  (favicon hashe recopie avec le nouveau `index.html`, son nom de fichier avait change
  depuis le dernier build deploye), aucun debordement horizontal en 390x844.

## [1.0.0] — 2026-07-24
### Ajoute
- Version initiale du jeu Tour de Tension
- Jenga 3D avec rendu Three.js
- Modele de stabilite realiste
- 2 joueurs local
- Audio atmospherique procedurale
- Interface responsive
- SEO complet
