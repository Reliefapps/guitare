# Guitare · Mes fiches

Fiches de travail personnelles pour la guitare et la basse : le manche, les
accords, les rythmiques, les exercices et les partitions — le tout sur une seule
page.

🔗 **https://reliefapps.github.io/guitare/**

## Le contenu

Le site est organisé en cinq onglets :

| Onglet | Contenu |
| --- | --- |
| 🎸 **Guitare** | Les notes sur le manche, les accords ouverts, les barrés (deux formes), les rythmiques, les exercices, les progressions, les arpèges et la gamme de La mineur (deux octaves, position ouverte et position fermée). |
| 🎵 **Basse** | Les pistes de batterie par tempo (60 à 180 bpm), la routine quotidienne, les exercices de main d'attaque (croisement de cordes, arpèges, cordes alternées, sauts d'octave), les notes sur le manche, les croches continues et l'araignée. |
| 🪘 **Malagueña** | L'enregistrement de référence et la partition complète : les 4 pages se suivent au défilement, avec zoom, saut de page au clavier et téléchargement. |
| 🎼 **Théorie** | Comment on construit une gamme : les intervalles W (un ton) et H (un demi-ton), A mineur et A majeur côte à côte, et un petit jeu « mineur ou majeur ? ». |
| 📄 **Bibliothèque** | Les partitions et grilles d'accords, consultables directement dans la page : un onglet par document, pages qui se suivent au défilement, zoom et téléchargement. |

Le fil conducteur : **une couleur par note**, la même partout — sur le manche,
dans les diagrammes d'accords, dans les progressions et dans les tablatures.
Les notes sont nommées en lettres (`A B C D E F G`) sur la fiche basse.

## Le projet

Un seul fichier, [`index.html`](index.html), qui contient tout : la mise en
page, les styles et le JavaScript. Aucune dépendance, aucune étape de build,
rien à installer. Les partitions sont embarquées dans le fichier ; les seules
ressources externes sont Google Fonts et une vidéo YouTube d'illustration.

Pour travailler dessus, il suffit d'ouvrir le fichier dans un navigateur :

```sh
open index.html
```

## Les tests

Une poignée de tests jsdom vérifient que les sections sont bien **rendues et
visibles** une fois l'onglet ouvert (pas seulement présentes dans le DOM), que
les ancres et le scrollspy suivent, et que les tablatures sont cohérentes avec
les notes qu'elles annoncent.

```sh
npm install   # une seule fois : jsdom
npm test
```

## Le déploiement

Chaque push sur `main` publie la racine du dépôt sur GitHub Pages via
[`.github/workflows`](.github/workflows/). Le fichier `.nojekyll` désactive le
traitement Jekyll pour que le site soit servi tel quel.
