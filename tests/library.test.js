'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

const BASE = 'https://reliefapps.github.io/guitare/';

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

test("l'onglet « Les amants de Saint Jean » est là et sélectionné", () => {
  const { doc } = load();
  openTab(doc, 'library');
  const onglets = [...doc.querySelectorAll('#page-library .doctab')];
  assert.equal(onglets.length, 1);
  assert.equal(onglets[0].textContent.trim(), 'Les amants de Saint Jean');
  assert.equal(onglets[0].getAttribute('aria-selected'), 'true');
  assert.equal(isVisible(onglets[0]), true);
  const doc1 = doc.getElementById('doc-' + onglets[0].dataset.doc);
  assert.ok(doc1, 'le panneau du document est introuvable');
  assert.equal(isVisible(doc1), true);
});

test('les 2 pages du PDF sont empilées et visibles', () => {
  const { doc } = load();
  openTab(doc, 'library');
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
  assert.equal(btn(1).getAttribute('aria-pressed'), 'true');
  fleche('ArrowLeft');
  assert.equal(btn(0).getAttribute('aria-pressed'), 'true');
});

test('les deux visionneuses sont indépendantes', () => {
  const { doc } = load();
  openTab(doc, 'library');
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
