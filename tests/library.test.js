'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

const BASE = 'https://reliefapps.github.io/guitare/';

/* la bibliothèque a plusieurs documents : on ouvre celui qu'on veut tester,
   en cliquant sur son onglet comme le ferait un lecteur */
function ouvreDoc(doc, nom){
  const tab = doc.querySelector(`#page-library .doctab[data-doc="${nom}"]`);
  if (!tab) throw new Error('document introuvable : ' + nom);
  tab.click();
  return tab;
}

test("la page bibliothèque répond à #/library", () => {
  const { doc, win } = load(BASE + '#/library');
  const page = doc.getElementById('page-library');
  assert.ok(page, '#page-library absent');
  assert.equal(page.hidden, false);
  assert.equal(doc.title, 'Bibliothèque · Mes fiches');
  assert.equal(doc.querySelector('.pagetab[data-page="library"]').getAttribute('aria-selected'), 'true');
  openTab(doc, 'guitare');
  openTab(doc, 'library');
  assert.equal(win.location.hash, '#/library');
});

test("les deux documents sont là, l'exercice en Am d'abord et ouvert", () => {
  const { doc } = load();
  openTab(doc, 'library');
  const onglets = [...doc.querySelectorAll('#page-library .doctab')];
  assert.deepEqual(onglets.map(t => t.textContent.trim()),
                   ['Exercice en Am', 'Les amants de Saint Jean']);
  assert.deepEqual(onglets.map(t => t.dataset.doc), ['exercice-am', 'saint-jean']);
  onglets.forEach(t => assert.equal(isVisible(t), true));
  /* au chargement : l'exercice est ouvert, la partition est repliée */
  assert.equal(onglets[0].getAttribute('aria-selected'), 'true');
  assert.equal(isVisible(doc.getElementById('doc-exercice-am')), true);
  assert.equal(onglets[1].getAttribute('aria-selected'), 'false');
  assert.equal(isVisible(doc.getElementById('doc-saint-jean')), false);
  /* et la bascule marche dans les deux sens */
  ouvreDoc(doc, 'saint-jean');
  assert.equal(isVisible(doc.getElementById('doc-saint-jean')), true);
  assert.equal(isVisible(doc.getElementById('doc-exercice-am')), false);
  ouvreDoc(doc, 'exercice-am');
  assert.equal(isVisible(doc.getElementById('doc-exercice-am')), true);
});

test("l'exercice en Am affiche ses cinq diagrammes d'accords", () => {
  const { doc } = load();
  openTab(doc, 'library');
  const cartes = [...doc.querySelectorAll('#exam-accords .chord-card')];
  assert.equal(cartes.length, 5);
  assert.deepEqual(cartes.map(c => c.querySelector('.chord-name').textContent),
                   ['Am', 'E', 'E7', 'E7', 'Dm']);
  cartes.forEach(c => {
    assert.equal(isVisible(c), true, c.id + ' rendu mais pas visible');
    assert.ok(c.querySelector('svg'), c.id + ' sans diagramme');
  });

  /* les doigtés de la feuille, relus dans le SVG : ○ à vide, × non jouée,
     et un rond noir chiffré par doigt posé */
  const doigts = id => [...doc.querySelectorAll('#exam-chord-' + id + ' svg circle')]
    .filter(c => c.getAttribute('fill') === 'var(--ink)').length;
  assert.equal(doigts('Am'), 3, 'Am se prend à trois doigts');
  assert.equal(doigts('E'), 3);
  assert.equal(doigts('E7'), 4, 'le E7 complet ajoute l\'auriculaire');
  assert.equal(doigts('E7bis'), 2, 'le E7 simplifié ne pose que deux doigts');
  assert.equal(doigts('Dm'), 3);

  /* la fondamentale est écrite dans sa couleur, comme partout ailleurs */
  const notes = id => [...doc.querySelectorAll('#exam-chord-' + id + ' svg text')]
    .filter(t => t.getAttribute('font-size') === '11.5').map(t => t.textContent);
  assert.deepEqual(notes('Am'), ['×', 'A', 'E', 'A', 'C', 'E']);
  assert.deepEqual(notes('Dm'), ['×', '×', 'D', 'A', 'D', 'F']);
  const fond = [...doc.querySelectorAll('#exam-chord-Dm svg text')]
    .filter(t => t.textContent === 'D' && t.getAttribute('font-size') === '11.5');
  fond.forEach(t => assert.equal(t.getAttribute('fill'), '#8E44AD', 'le D doit être violet'));
});

test('les quatre grilles de l\'exercice sont celles de la feuille', () => {
  const { doc } = load();
  openTab(doc, 'library');
  const cartes = [...doc.querySelectorAll('#exam-grilles .prog-card')];
  assert.deepEqual(cartes.map(c => c.querySelector('.grille-nom').textContent),
                   ['Intro', 'Couplet', 'Pré-refrain', 'Refrain']);

  const lire = carte => [...carte.querySelectorAll('.prog-line')].map(l =>
    [...l.querySelectorAll('.measure')].map(m =>
      [...m.querySelectorAll('.chip')].map(c => c.textContent).join('/')));

  assert.deepEqual(lire(cartes[0]), [['Dm', 'Am', 'E', 'Am']]);
  assert.deepEqual(lire(cartes[1]), [['Am', 'Am', 'Dm', 'Am'],
                                     ['Am', 'Dm', 'E', 'Am']]);
  assert.deepEqual(lire(cartes[2]), [['Am', 'Am', 'Dm', 'Am'],
                                     ['E(7)', 'Am', 'Am/Dm', 'E(7)']]);
  assert.deepEqual(lire(cartes[3]), [['Am', 'Am', 'Am/Dm', 'Am'],
                                     ['Dm', 'Am', 'E(7)', 'Am']]);

  /* chaque ligne fait bien quatre mesures, et tout est visible */
  cartes.forEach(c => {
    assert.equal(isVisible(c), true, 'grille rendue mais pas visible');
    lire(c).forEach(l => assert.equal(l.length, 4));
  });

  /* la couleur de la pastille suit la fondamentale de l'accord
     (jsdom renormalise les hexadécimaux en rgb()) */
  const couleurs = { Am:'rgb(44, 127, 184)', Dm:'rgb(142, 68, 173)',
                     E:'rgb(46, 139, 87)', 'E(7)':'rgb(46, 139, 87)' };
  [...doc.querySelectorAll('#exam-grilles .chip')].forEach(c => {
    assert.equal(c.style.background, couleurs[c.textContent],
                 c.textContent + ' : mauvaise couleur');
  });
});

test('la rythmique 3/4 est dessinée : trois temps, trois coups vers le bas', () => {
  const { doc } = load();
  openTab(doc, 'library');
  const svg = doc.querySelector('#exam-rythmique svg');
  assert.ok(svg, 'la rythmique n\'est pas dessinée');
  assert.equal(isVisible(svg), true);
  assert.match(svg.getAttribute('aria-label'), /trois coups vers le bas/);
  /* trois têtes de noire, trois flèches vers le bas */
  assert.equal(svg.querySelectorAll('ellipse').length, 3);
  assert.equal(svg.querySelectorAll('polygon').length, 3);
  const textes = [...svg.querySelectorAll('text')].map(t => t.textContent);
  assert.deepEqual(textes, ['3', '4', '1', 'to', '2', 'ta', '3', 'ta']);
});

test('la feuille en Em est transposée en Am, sans recopier les paroles', () => {
  const { doc } = load();
  openTab(doc, 'library');
  ouvreDoc(doc, 'saint-jean');
  const bloc = doc.getElementById('sj-en-am');
  assert.ok(bloc, 'le bloc « la même chanson en Am » est absent');
  assert.equal(isVisible(bloc), true);

  /* la table de transposition : une quarte plus haut, cinq demi-tons */
  const paires = [...doc.querySelectorAll('#sj-transpo .transpo-paire')].map(p =>
    [...p.querySelectorAll('.chip')].map(c => c.textContent));
  assert.deepEqual(paires, [['Em', 'Am'], ['Am', 'Dm'], ['B7', 'E7']]);

  const lire = carte => [...carte.querySelectorAll('.ligne-accords')].map(l =>
    [...l.querySelectorAll('.chip')].map(c => c.textContent));
  const cartes = [...doc.querySelectorAll('#sj-grilles .prog-card')];
  assert.deepEqual(cartes.map(c => c.querySelector('.grille-nom').textContent),
                   ['Couplet', 'Refrain', 'Final']);

  /* une ligne = une ligne chantée, pas une rangée du scan : la colonne y est
     étroite et replie chaque ligne de refrain sur deux rangées */
  assert.deepEqual(lire(cartes[0]), [['Am', 'Am'], ['Dm', 'Am'],
                                     ['Am', 'Dm'], ['E7', 'Am']]);
  assert.deepEqual(lire(cartes[1]), [['Am', 'Am', 'Dm', 'Am'],
                                     ['Dm', 'Am', 'Dm', 'E7'],
                                     ['Am', 'Am', 'Dm', 'Am'],
                                     ['Dm', 'Am', 'E7', 'Am']]);
  assert.deepEqual(lire(cartes[2]), [['Dm', 'Am', 'E7', 'Am']]);
  /* le refrain fait quatre lignes de quatre accords : deux couplets de long */
  assert.equal(lire(cartes[1]).length, 4);
  lire(cartes[1]).forEach(l => assert.equal(l.length, 4));

  /* les lignes sont numérotées comme sur le scan */
  cartes.forEach(c => {
    const nums = [...c.querySelectorAll('.ligne-num')].map(n => n.textContent);
    assert.deepEqual(nums, nums.map((_, i) => String(i + 1)));
  });
});

test('le couplet transposé est exactement celui de l\'exercice en Am', () => {
  const { doc } = load();
  openTab(doc, 'library');
  /* les huit mesures du couplet de l'exercice, dans l'ordre */
  const exo = [...doc.querySelectorAll('#exam-grilles .prog-card')]
    .find(c => c.querySelector('.grille-nom').textContent === 'Couplet');
  const mesures = [...exo.querySelectorAll('.measure .chip')].map(c => c.textContent);
  /* les mêmes huit, relues ligne par ligne sur la feuille transposée */
  ouvreDoc(doc, 'saint-jean');
  const couplet = doc.querySelector('#sj-grilles .prog-card');
  const suite = [...couplet.querySelectorAll('.chip')].map(c => c.textContent);
  /* seule différence : le tuto écrit E là où la feuille donne E7 — même
     accord de dominante, la septième ne fait qu'appuyer le retour sur Am */
  const sansSeptieme = a => a.map(c => c === 'E7' ? 'E' : c);
  assert.deepEqual(sansSeptieme(suite), sansSeptieme(mesures));
  assert.deepEqual(suite, ['Am', 'Am', 'Dm', 'Am', 'Am', 'Dm', 'E7', 'Am']);
  assert.deepEqual(mesures, ['Am', 'Am', 'Dm', 'Am', 'Am', 'Dm', 'E', 'Am']);
});

test('le refrain de la feuille recouvre le pré-refrain puis le refrain du tuto', () => {
  const { doc } = load();
  openTab(doc, 'library');
  const demiGrille = nom => {
    const carte = [...doc.querySelectorAll('#exam-grilles .prog-card')]
      .find(c => c.querySelector('.grille-nom').textContent === nom);
    return [...carte.querySelectorAll('.prog-line')].map(l =>
      [...l.querySelectorAll('.chip')].map(c => c.textContent));
  };
  const tuto = [...demiGrille('Pré-refrain'), ...demiGrille('Refrain')];

  ouvreDoc(doc, 'saint-jean');
  const feuille = [...doc.querySelectorAll('#sj-grilles .prog-card')]
    .find(c => c.querySelector('.grille-nom').textContent === 'Refrain');
  const lignes = [...feuille.querySelectorAll('.ligne-accords')].map(l =>
    [...l.querySelectorAll('.chip')].map(c => c.textContent));

  assert.equal(lignes.length, tuto.length, 'quatre lignes de chaque côté');
  /* lignes 1 et 4 : identiques au E7 près (le tuto écrit E(7)) */
  const sansSeptieme = a => a.map(c => c === 'E7' || c === 'E(7)' ? 'E' : c);
  assert.deepEqual(sansSeptieme(lignes[0]), sansSeptieme(tuto[0]));
  assert.deepEqual(sansSeptieme(lignes[3]), sansSeptieme(tuto[3]));
  /* ligne 3 : le tuto coupe la mesure en Am/Dm là où la feuille reste sur Dm */
  assert.deepEqual(lignes[2], ['Am', 'Am', 'Dm', 'Am']);
  assert.deepEqual(tuto[2], ['Am', 'Am', 'Am', 'Dm', 'Am']);
  /* ligne 2 : la seule qui change vraiment d'accords */
  assert.notDeepEqual(sansSeptieme(lignes[1]), sansSeptieme(tuto[1]));
});

test('les 2 pages du PDF sont empilées et visibles', () => {
  const { doc } = load();
  openTab(doc, 'library');
  ouvreDoc(doc, 'saint-jean');
  const pages = [...doc.querySelectorAll('#sj-sheet .sheet-page')];
  assert.equal(pages.length, 2, 'le PDF fait 2 pages');
  pages.forEach((f, i) => {
    assert.equal(isVisible(f), true, `page ${i+1} rendue mais pas visible`);
    const img = f.querySelector('img');
    assert.match(img.getAttribute('src'), /^data:image\/webp;base64,/);
    assert.equal(img.alt, `Les amants de Saint Jean — page ${i+1} sur 2`);
    assert.equal(f.querySelector('figcaption').textContent, `page ${i+1} / 2`);
  });
  const srcs = pages.map(f => f.querySelector('img').getAttribute('src'));
  assert.equal(new Set(srcs).size, 2, 'deux images distinctes attendues');
});

test('les boutons, le zoom et le téléchargement suivent la page', () => {
  const { doc } = load();
  openTab(doc, 'library');
  ouvreDoc(doc, 'saint-jean');
  const btns = [...doc.querySelectorAll('#sj-bar .pgbtn[data-p]')];
  const dl = doc.getElementById('sj-dl');
  assert.equal(btns.length, 2);
  assert.equal(doc.getElementById('sj-prev').disabled, true);
  assert.equal(dl.getAttribute('download'), 'les-amants-de-saint-jean-page-1.webp');
  assert.match(dl.getAttribute('href'), /^data:image\/webp;base64,/);

  btns[1].click();
  assert.equal(btns[1].getAttribute('aria-pressed'), 'true');
  assert.equal(btns[0].getAttribute('aria-pressed'), 'false');
  assert.equal(doc.getElementById('sj-next').disabled, true, 'page 2 : « suivant » inactif');
  assert.equal(dl.getAttribute('download'), 'les-amants-de-saint-jean-page-2.webp');

  const sheet = doc.getElementById('sj-sheet');
  const zoom = doc.getElementById('sj-zoom');
  zoom.click();
  assert.equal(sheet.classList.contains('zoom'), true);
  zoom.click();
  assert.equal(sheet.classList.contains('zoom'), false);
});

test('les flèches du clavier ne pilotent que la page affichée', () => {
  const { doc, win } = load();
  const btn = i => doc.querySelectorAll('#sj-bar .pgbtn[data-p]')[i];
  const fleche = k => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  openTab(doc, 'malaguena');
  fleche('ArrowRight');
  assert.equal(btn(0).getAttribute('aria-pressed'), 'true', 'la bibliothèque ne doit pas bouger');

  openTab(doc, 'library');
  fleche('ArrowRight');
  assert.equal(btn(0).getAttribute('aria-pressed'), 'true',
               'la partition est repliée : les flèches ne la pilotent pas');

  ouvreDoc(doc, 'saint-jean');
  fleche('ArrowRight');
  assert.equal(btn(1).getAttribute('aria-pressed'), 'true');
  fleche('ArrowLeft');
  assert.equal(btn(0).getAttribute('aria-pressed'), 'true');
});

test('les deux visionneuses sont indépendantes', () => {
  const { doc } = load();
  openTab(doc, 'library');
  ouvreDoc(doc, 'saint-jean');
  doc.querySelectorAll('#sj-bar .pgbtn[data-p]')[1].click();
  openTab(doc, 'malaguena');
  /* la Malagueña reste sur sa page 1 */
  assert.equal(doc.querySelector('#mal-bar .pgbtn[data-p="0"]').getAttribute('aria-pressed'), 'true');
  assert.equal(doc.getElementById('mal-dl').getAttribute('download'), 'malaguena-page-1.webp');
  /* et la bibliothèque a gardé sa page 2 */
  assert.equal(doc.querySelectorAll('#sj-bar .pgbtn[data-p]')[1].getAttribute('aria-pressed'), 'true');
});

test('les 5 onglets gardent un nom accessible même sans libellé visible', () => {
  const { doc } = load();
  const tabs = [...doc.querySelectorAll('.pagetab')];
  assert.equal(tabs.length, 5);
  tabs.forEach(t => {
    /* sous 430px le libellé est masqué en CSS : le nom doit survivre */
    assert.ok(t.getAttribute('aria-label'), t.dataset.page + ' sans aria-label');
    assert.equal(t.getAttribute('title'), t.getAttribute('aria-label'));
    assert.ok(t.querySelector('.lbl'), t.dataset.page + ' : libellé non enveloppé dans .lbl');
    assert.equal(t.querySelector('.lbl').textContent, t.getAttribute('aria-label'));
    assert.ok(t.querySelector('.ic'), t.dataset.page + ' sans icône');
  });
});
