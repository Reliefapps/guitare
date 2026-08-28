'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* les 7 sections de l'onglet basse, dans l'ordre attendu */
const SECTIONS = [
  ['routine',      '1', 'La routine quotidienne'],
  ['main-attaque', '2', "La main d'attaque"],
  ['pluck-avance', '3', 'Les exercices avancés'],
  ['notes-manche', '4', 'Les notes sur le manche'],
  ['croches',      '5', 'Croches continues'],
  ['tempo',        '6', 'Tempo & rythme'],
  ['araignee',     '7', "L'araignée"],
];

test('la page se charge sans erreur de script', () => {
  const { jsErrors } = load();
  assert.deepEqual(jsErrors.map(e => e.message), []);
});

test("les sections de la basse sont masquées tant qu'on est sur l'onglet guitare", () => {
  const { doc } = load();
  for (const [id] of SECTIONS){
    const sec = doc.getElementById(id);
    assert.ok(sec, `#${id} absente du DOM`);
    assert.equal(isVisible(sec), false, `#${id} ne devrait pas être visible depuis l'onglet guitare`);
  }
});

test("les 7 sections sont rendues ET visibles après passage sur l'onglet basse", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, num, titre] of SECTIONS){
    const sec = doc.getElementById(id);
    assert.ok(sec, `#${id} absente du DOM`);
    assert.equal(isVisible(sec), true, `#${id} est dans le DOM mais pas visible`);
    assert.equal(sec.querySelector('.sec-num').textContent.trim(), num, `mauvais numéro pour #${id}`);
    assert.equal(sec.querySelector('h2').textContent.trim(), titre, `mauvais titre pour #${id}`);
  }
});

test('les sections sont dans le bon ordre dans la page', () => {
  const { doc } = load();
  const ids = [...doc.querySelectorAll('#page-basse section')].map(s => s.id);
  assert.deepEqual(ids, SECTIONS.map(s => s[0]));
});

test('les 7 ancres du sommaire pointent vers une section existante et visible', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const liens = [...doc.querySelectorAll('#page-basse nav.sticky a')];
  assert.equal(liens.length, 7);
  liens.forEach((a, i) => {
    const [id, num, titre] = SECTIONS[i];
    assert.equal(a.getAttribute('href'), '#' + id);
    assert.match(a.textContent, new RegExp('^' + num + ' · '));
    const cible = doc.getElementById(id);
    assert.ok(cible, `l'ancre ${a.getAttribute('href')} ne mène nulle part`);
    assert.equal(isVisible(cible), true, `l'ancre ${a.getAttribute('href')} mène à une section masquée`);
    assert.ok(titre.length > 0);
  });
});

test('le sommaire latéral liste les 7 sections et les sous-parties', () => {
  const { doc } = load();
  const lvl1 = [...doc.querySelectorAll('#sidenav-links-basse a.lvl1')];
  assert.deepEqual(lvl1.map(a => a.getAttribute('href')),
    SECTIONS.map(s => '#' + s[0]));
  /* les 4 exercices de main d'attaque apparaissent en second niveau */
  const lvl2 = [...doc.querySelectorAll('#sidenav-links-basse a.lvl2')]
    .map(a => a.getAttribute('href'));
  for (const id of ['#px-p1','#px-p2','#px-p3','#px-p4']) assert.ok(lvl2.includes(id), id + ' absent du sommaire');
});

test('le scrollspy marque la bonne section', () => {
  const { doc, observers } = load();
  openTab(doc, 'basse');
  /* le dernier observateur créé est celui de la page basse */
  const spy = observers[observers.length - 1];
  assert.equal(spy.targets.length, 7, 'les 7 sections doivent être observées');
  for (const [id] of SECTIONS){
    spy.enter(doc.getElementById(id));
    const actifs = [...doc.querySelectorAll('#sidenav-links-basse a.active')];
    assert.equal(actifs.length, 1, `une seule section active attendue pour #${id}`);
    assert.equal(actifs[0].getAttribute('href'), '#' + id);
  }
});
