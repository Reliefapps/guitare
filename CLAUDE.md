# Guitare · Mes fiches — notes pour Claude

Fiches de travail personnelles de Raphaël pour la guitare et la basse. Site
statique publié sur GitHub Pages : <https://reliefapps.github.io/guitare/>

## Le dépôt

**Un seul fichier**, [`index.html`](index.html) : la mise en page, les styles et
le JavaScript y sont tous embarqués. Aucune dépendance à l'exécution, aucune
étape de build. Les partitions sont embarquées en webp ; les seules ressources
externes sont Google Fonts et des vidéos YouTube.

Cinq onglets, un `<div class="page">` chacun, bascule sans rechargement
(`#/guitare`, `#/basse`, `#/malaguena`, `#/theorie`, `#/library`). Chaque page a
son propre IIFE `<script>` ; `NOTE_COLORS` est volontairement redéclaré dans
chacun plutôt que partagé.

## Les conventions à respecter

- **Une couleur par note**, la même partout — manche, diagrammes d'accords,
  tablatures, pastilles. `NOTE_COLORS` fait foi.
- **Les notes se nomment en lettres** (`A B C D E F G`) sur les fiches basse et
  théorie, jamais en solfège. `tests/notation.test.js` le vérifie sur les zones
  listées dans sa constante `NOUVEAU` — y ajouter toute nouvelle section.
- **Le contenu vient des cours**, transcrits depuis Wispr Flow. Ne rien inventer
  que le prof n'a pas dit : tempos, nombre de mesures, doigtés. Citer la date du
  cours dans la section ajoutée.
- **Tout est en français**, y compris les commentaires du code et les messages
  de commit.
- Les sections sont numérotées à la main (`.sec-num`) dans trois endroits qui
  doivent rester d'accord : l'en-tête de section, le sommaire collant
  (`nav.sticky`) et le sommaire latéral construit en JS. Insérer une section au
  milieu veut dire renuméroter les trois.

## Les tests

```sh
npm install   # une seule fois : jsdom
npm test
```

Les tests jsdom vérifient que les sections sont **rendues et visibles** une fois
l'onglet ouvert (pas seulement présentes dans le DOM — c'est le piège qu'on a
déjà raté), que les ancres et le scrollspy suivent, et que les tablatures et les
diagrammes sont cohérents avec les notes qu'ils annoncent. Toute nouvelle
section se teste au même niveau.

## Le git

**Après chaque fonctionnalité terminée et testée : commit et push sur `main`
directement**, sans demander. Raphaël l'a autorisé une fois pour toutes. Chaque
push publie le site via [`.github/workflows`](.github/workflows/), donc on ne
pousse que si `npm test` passe.

Messages de commit conventionnels, en français, avec un corps qui explique le
pourquoi :

```
feat(basse): ajoute l'exercice d'improvisation sur Am / G

Corps expliquant la décision, pas seulement le changement.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```
