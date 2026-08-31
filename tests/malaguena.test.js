'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

const BASE = 'https://reliefapps.github.io/guitare/';

test("l'onglet Malagueña répond à #/malaguena", () => {
  const { doc, win } = load(BASE + '#/malaguena');
  const page = doc.getElementById('page-malaguena');
  assert.ok(page, '#page-malaguena absent');
  assert.equal(page.hidden, false, "la page doit s'ouvrir sur cette ancre");
  assert.equal(doc.getElementById('page-guitare').hidden, true);
  assert.equal(doc.title, 'Malagueña · Mes fiches');
  assert.equal(doc.querySelector('.pagetab[data-page="malaguena"]').getAttribute('aria-selected'), 'true');
  /* l'ancre est bien réécrite sous sa nouvelle forme quand on clique */
  openTab(doc, 'guitare');
  openTab(doc, 'malaguena');
  assert.equal(win.location.hash, '#/malaguena');
});

test("l'ancienne ancre #/mal n'existe plus", () => {
  const { doc } = load(BASE + '#/mal');
  /* route inconnue : on retombe sur la guitare plutôt que sur une page vide */
  assert.equal(doc.getElementById('page-guitare').hidden, false);
  assert.equal(doc.getElementById('page-malaguena').hidden, true);
  assert.equal(doc.querySelectorAll('[data-page="mal"], #page-mal').length, 0);
});

test("l'onglet Bibliothèque a disparu, ses restes aussi", () => {
  const { doc } = load();
  assert.deepEqual([...doc.querySelectorAll('.pagetab')].map(t => t.dataset.page),
    ['guitare', 'basse', 'malaguena', 'theorie', 'library']);
  assert.equal(doc.getElementById('page-biblio'), null);
  assert.equal(doc.querySelectorAll('.doc-card, .struct-row, .fact').length, 0);
});

test('la partition et son téléchargement sont sur la page Malagueña', () => {
  const { doc } = load();
  openTab(doc, 'malaguena');
  const viewer = doc.querySelector('#page-malaguena .viewer');
  assert.ok(viewer, 'visionneuse absente de la page Malagueña');
  assert.equal(isVisible(viewer), true);
  const dl = doc.querySelector('#page-malaguena #mal-dl');
  assert.equal(isVisible(dl), true, 'lien de téléchargement absent ou masqué');
  assert.match(dl.getAttribute('download'), /^malaguena-page-1\.webp$/);
  assert.match(dl.getAttribute('href'), /^data:image\/webp;base64,/);
});

test('les 4 pages sont empilées et visibles, pas une seule à la fois', () => {
  const { doc } = load();
  openTab(doc, 'malaguena');
  const pages = [...doc.querySelectorAll('#mal-sheet .sheet-page')];
  assert.equal(pages.length, 4, 'les quatre pages doivent être dans le DOM');
  pages.forEach((f, i) => {
    assert.equal(isVisible(f), true, `page ${i+1} rendue mais pas visible`);
    const img = f.querySelector('img');
    assert.match(img.getAttribute('src'), /^data:image\/webp;base64,/);
    assert.equal(img.alt, `Malagueña — page ${i+1} sur 4`);
    assert.equal(f.querySelector('figcaption').textContent, `page ${i+1} / 4`);
  });
  /* quatre images distinctes, pas la même répétée */
  const srcs = pages.map(f => f.querySelector('img').getAttribute('src'));
  assert.equal(new Set(srcs).size, 4);
});

test('les boutons de page suivent la page courante', () => {
  const { doc } = load();
  openTab(doc, 'malaguena');
  const btns = [...doc.querySelectorAll('#page-malaguena .pgbtn[data-p]')];
  const dl = doc.getElementById('mal-dl');
  assert.equal(btns.length, 4);
  const actif = () => btns.findIndex(b => b.getAttribute('aria-pressed') === 'true');
  assert.equal(actif(), 0);
  assert.equal(doc.getElementById('mal-prev').disabled, true, 'page 1 : « précédent » inactif');

  btns[2].click();
  assert.equal(actif(), 2);
  assert.equal(dl.getAttribute('download'), 'malaguena-page-3.webp');
  assert.match(dl.textContent, /page 3/);

  doc.getElementById('mal-next').click();
  assert.equal(actif(), 3);
  assert.equal(doc.getElementById('mal-next').disabled, true, 'page 4 : « suivant » inactif');
  doc.getElementById('mal-prev').click();
  assert.equal(actif(), 2);
});

test('les flèches du clavier ne répondent que sur la page Malagueña', () => {
  const { doc, win } = load();
  const fleche = k => doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  const actif = () => [...doc.querySelectorAll('#page-malaguena .pgbtn[data-p]')]
    .findIndex(b => b.getAttribute('aria-pressed') === 'true');

  fleche('ArrowRight');                    /* onglet guitare : aucun effet */
  assert.equal(actif(), 0);

  openTab(doc, 'malaguena');
  fleche('ArrowRight');
  assert.equal(actif(), 1);
  fleche('ArrowLeft');
  assert.equal(actif(), 0);
});

test('le zoom bascule sur la feuille', () => {
  const { doc } = load();
  openTab(doc, 'malaguena');
  const sheet = doc.getElementById('mal-sheet');
  const zoom = doc.getElementById('mal-zoom');
  assert.equal(sheet.classList.contains('zoom'), false);
  zoom.click();
  assert.equal(sheet.classList.contains('zoom'), true);
  assert.equal(zoom.getAttribute('aria-pressed'), 'true');
  zoom.click();
  assert.equal(sheet.classList.contains('zoom'), false);
});

test("la vidéo de référence reste sur la page", () => {
  const { doc } = load();
  openTab(doc, 'malaguena');
  const f = doc.querySelector('#page-malaguena .video-frame iframe');
  assert.ok(f);
  assert.equal(isVisible(f), true);
  assert.match(f.getAttribute('src'), /youtube-nocookie\.com\/embed\//);
});
