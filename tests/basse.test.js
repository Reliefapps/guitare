'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* les 5 sections de l'onglet basse, dans l'ordre attendu */
const SECTIONS = [
  ['routine',      '1', 'La routine quotidienne'],
  ['pluck-avance', '2', 'Les exercices avancés'],
  ['notes-manche', '3', 'Les notes sur le manche'],
  ['croches',      '4', 'Croches continues'],
  ['araignee',     '5', "L'araignée"],
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

test("les 5 sections sont rendues ET visibles après passage sur l'onglet basse", () => {
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

test('les 5 ancres du sommaire pointent vers une section existante et visible', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const liens = [...doc.querySelectorAll('#page-basse nav.sticky a')];
  assert.equal(liens.length, 5);
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

test('le sommaire latéral liste les 5 sections et les sous-parties', () => {
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
  assert.equal(spy.targets.length, 5, 'les 5 sections doivent être observées');
  for (const [id] of SECTIONS){
    spy.enter(doc.getElementById(id));
    const actifs = [...doc.querySelectorAll('#sidenav-links-basse a.active')];
    assert.equal(actifs.length, 1, `une seule section active attendue pour #${id}`);
    assert.equal(actifs[0].getAttribute('href'), '#' + id);
  }
});

test("les sections retirées ne sont plus dans la page", () => {
  const { doc } = load();
  for (const id of ['main-attaque', 'tempo', 'vid-list']){
    assert.equal(doc.getElementById(id), null, '#' + id + ' devrait avoir disparu');
  }
  /* plus aucune section ne porte ces titres (la main d'attaque reste citée
     dans les exercices, c'est bien leur sujet) */
  const titres = [...doc.querySelectorAll('#page-basse h2')].map(h => h.textContent.trim());
  for (const t of ["La main d'attaque", 'Tempo & rythme']){
    assert.ok(!titres.includes(t), 'section encore présente : ' + t);
  }
  const basse = doc.getElementById('page-basse').textContent;
  for (const bout of ['Ce que Santiago a dit', 'Accordage standard', 'Comment travailler',
                      'La position', 'Les erreurs à éviter', 'Playlist 1']){
    assert.ok(!basse.includes(bout), 'texte encore présent : ' + bout);
  }
  assert.equal(doc.querySelectorAll('#croches .status-table, #croches .warn').length, 0);
});

test("la playlist batterie est en tête de page", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const a = doc.querySelector('#page-basse .hero .hero-link');
  assert.ok(a, 'lien de playlist absent du chapô');
  assert.equal(isVisible(a), true);
  assert.equal(a.getAttribute('href'),
    'https://www.youtube.com/playlist?list=PLt_W1IWJABR2R5GL_TjkCrv6oTkeWkLMH');
  assert.equal(a.target, '_blank');
  assert.equal(a.rel, 'noopener');
});
