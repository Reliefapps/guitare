# Guitare · Mes fiches

Fiches de travail personnelles pour la guitare et la basse : le manche, les
accords, les rythmiques, les exercices et les partitions — le tout sur une seule
page.

🔗 **https://reliefapps.github.io/guitare/**

## Le contenu

Le site est organisé en quatre onglets :

| Onglet | Contenu |
| --- | --- |
| 🎸 **Guitare** | Les notes sur le manche, les accords ouverts, les barrés (deux formes), les rythmiques, les exercices, les progressions et les arpèges. |
| 🎵 **Basse** | Les exercices de fond : croches continues, tempo & rythme, l'araignée. |
| 🪘 **Malagueña** | Le morceau découpé en étapes, dans l'ordre où le travailler ; chaque étape renvoie à la bonne page de la partition. |
| 📄 **Bibliothèque** | Les partitions consultables directement dans la page (visionneuse avec zoom, navigation au clavier et téléchargement). |

Le fil conducteur : **une couleur par note**, la même partout — sur le manche,
dans les diagrammes d'accords et dans les progressions.

## Le projet

Un seul fichier, [`index.html`](index.html), qui contient tout : la mise en
page, les styles et le JavaScript. Aucune dépendance, aucune étape de build,
rien à installer. Les partitions sont embarquées dans le fichier ; les seules
ressources externes sont Google Fonts et une vidéo YouTube d'illustration.

Pour travailler dessus, il suffit d'ouvrir le fichier dans un navigateur :

```sh
open index.html
```

## Le déploiement

Chaque push sur `main` publie la racine du dépôt sur GitHub Pages via
[`.github/workflows`](.github/workflows/). Le fichier `.nojekyll` désactive le
traitement Jekyll pour que le site soit servi tel quel.
