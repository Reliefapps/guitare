'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ la section 6 de l'onglet théorie : le jeu complet ============ */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}
/* la touche de la palette (à dièses) qui sonne comme la note épelée */
const surPalette = nom => CHROMA[hauteur(nom)];
const ouvre = () => { const r = load(); openTab(r.doc, 'theorie'); return r; };
const zoneDe = doc => doc.getElementById('jeu-zone');
const slots = doc => [...doc.querySelectorAll('#jeu-slots .quiz-slot')];
const remplies = doc => [...doc.querySelectorAll('#jeu-slots .quiz-slot.filled')];
const jouer = (doc, note) => doc.querySelector(`#jeu-palette [data-note="${surPalette(note)}"]`).click();

/* les quatre étapes attendues pour une fondamentale, recalculées avec les
   recettes que la page expose */
function etapes(win, root, type){
  const g = [...win.theorie.gammeDe(root, type)];
  const triade = [g[0], g[2], g[4]];
  return [
    { attendu:g, donnees:1, formule: type === 'mineur' ? 'W H W W H W W' : 'W W H W W W H' },
    { attendu:triade, donnees:1, formule:'1 · 3 · 5' },
    { attendu:triade.concat([g[6]]), donnees:3, formule:'1 · 3 · 5 · 7' },
    { attendu:[...win.theorie.penta(root, type)], donnees:1,
      formule: type === 'mineur' ? '1 · ♭3 · 4 · 5 · ♭7' : '1 · 2 · 3 · 5 · 6' },
  ];
}
function etatCourant(doc, win){
  const { root, type } = zoneDe(doc).dataset;
  return { root, type, liste: etapes(win, root, type) };
}
/* joue une étape entière, juste */
function reussir(doc, e){
  for (const note of e.attendu.slice(e.donnees)) jouer(doc, note);
}

test('la section 6 et son entrée de sommaire sont visibles dans Théorie, et nulle part ailleurs', () => {
  const { doc } = load();
  const sec = doc.getElementById('jeu');
  const lien = doc.querySelector('#page-theorie nav.sticky a[href="#jeu"]');
  assert.ok(sec, 'section #jeu absente');
  assert.ok(lien, 'entrée de sommaire absente');
  assert.equal(lien.textContent, '6 · Le jeu');
  assert.equal(isVisible(sec), false);
  for (const page of ['basse', 'malaguena', 'library']){
    openTab(doc, page);
    assert.equal(isVisible(sec), false, 'section visible depuis ' + page);
  }
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '6');
  assert.equal(sec.querySelector('h2').textContent, 'Le jeu — de la gamme à la pentatonique');
  /* elle vient en dernier, après les boîtes */
  const ids = [...doc.querySelectorAll('#page-theorie section')].map(x => x.id);
  assert.deepEqual(ids, ['construire', 'gammes', 'triades', 'penta', 'boites', 'jeu']);
});

test('étape 1 — une fondamentale et un type sont tirés, la gamme est à compléter avec la formule sous les yeux', () => {
  const { doc } = ouvre();
  const zone = zoneDe(doc);
  assert.equal(isVisible(zone), true);
  assert.ok(['mineur', 'majeur'].includes(zone.dataset.type));
  assert.match(zone.dataset.root, /^[A-G][♯♭]?$/);
  assert.equal(zone.dataset.etape, '1');
  assert.match(doc.getElementById('jeu-prompt').textContent, new RegExp(zone.dataset.root + ' ' + zone.dataset.type + ' — étape 1 / 4'));
  const etape = doc.getElementById('jeu-etape').textContent;
  assert.match(etape, /La gamme/);
  assert.match(etape, zone.dataset.type === 'mineur' ? /W H W W H W W/ : /W W H W W W H/);
  /* la fondamentale est donnée, six cases vides ; rien d'acquis encore */
  assert.equal(slots(doc).length, 7);
  assert.equal(slots(doc)[0].textContent, zone.dataset.root);
  assert.ok(slots(doc)[0].classList.contains('given'));
  assert.equal(slots(doc).slice(1).every(s => s.textContent === ''), true);
  assert.equal(doc.getElementById('jeu-acquis').children.length, 0);
  /* douze touches, les noires avec leurs deux noms */
  const palette = [...doc.querySelectorAll('#jeu-palette button')];
  assert.deepEqual(palette.map(b => b.dataset.note), CHROMA);
  assert.equal(palette.find(b => b.dataset.note === 'A#').textContent, 'A♯/B♭');
  assert.equal(doc.getElementById('jeu-undo').textContent, '← Effacer');
  assert.equal(doc.getElementById('jeu-new').textContent, 'Nouvelle gamme →');
});

test('les quatre étapes s\'enchaînent sur la même fondamentale, chacune bâtie sur la précédente', () => {
  const { doc, win } = ouvre();
  const { root, type, liste } = etatCourant(doc, win);
  const feedback = doc.getElementById('jeu-feedback');
  const bouton = doc.getElementById('jeu-new');
  const acquis = () => [...doc.querySelectorAll('#jeu-acquis .rel-line')]
    .map(l => [...l.querySelectorAll('.scale-note')].map(n => n.textContent));

  liste.forEach((e, i) => {
    assert.equal(zoneDe(doc).dataset.root, root, 'la fondamentale a changé en cours de route');
    assert.equal(zoneDe(doc).dataset.etape, String(i + 1));
    assert.match(doc.getElementById('jeu-etape').textContent, new RegExp(e.formule.replace(/[♭·]/g, '.')));
    /* les étapes passées restent affichées, dans l'ordre, avec leurs notes */
    assert.deepEqual(acquis(), liste.slice(0, i).map(x => x.attendu));
    /* les notes données, puis les cases à remplir */
    const donnees = slots(doc).filter(s => s.classList.contains('given')).map(s => s.textContent);
    assert.deepEqual(donnees, e.attendu.slice(0, e.donnees));
    assert.equal(slots(doc).length, e.attendu.length);

    reussir(doc, e);
    assert.match(feedback.textContent, /✓/);
    assert.match(feedback.textContent, new RegExp("c'est " + e.attendu.join(' · ')));
    assert.deepEqual(remplies(doc).map(s => s.textContent), e.attendu.slice(e.donnees));
    remplies(doc).forEach(s => assert.ok(s.classList.contains('correct')));
    assert.equal(doc.getElementById('jeu-score').textContent, `${i + 1} / ${i + 1}`);
    assert.equal(doc.querySelector('#jeu-palette button').disabled, true);
    assert.equal(bouton.textContent, i < 3 ? 'Étape suivante →' : 'Nouvelle gamme →');
    bouton.click();
  });
  /* après la quatrième, une autre fondamentale repart de l'étape 1, le score reste */
  assert.equal(zoneDe(doc).dataset.etape, '1');
  assert.equal(doc.getElementById('jeu-acquis').children.length, 0);
  assert.equal(feedback.textContent, '');
  assert.equal(doc.getElementById('jeu-score').textContent, '4 / 4');
  assert.equal(slots(doc).length, 7);
});

test('l\'étape de la septième donne les trois notes de la triade et n\'en demande qu\'une', () => {
  const { doc, win } = ouvre();
  const { liste } = etatCourant(doc, win);
  reussir(doc, liste[0]); doc.getElementById('jeu-new').click();
  reussir(doc, liste[1]); doc.getElementById('jeu-new').click();
  assert.equal(zoneDe(doc).dataset.etape, '3');
  assert.match(doc.getElementById('jeu-etape').textContent, /La septième/);
  assert.deepEqual(slots(doc).map(s => s.textContent), liste[2].attendu.slice(0, 3).concat(['']));
  jouer(doc, liste[2].attendu[3]);
  assert.match(doc.getElementById('jeu-feedback').textContent, /✓/);
  assert.match(doc.getElementById('jeu-feedback').textContent, /m7|maj7/);
});

test('une note fausse est signalée, effacer corrige, et l\'étape suivante repart des bonnes notes', () => {
  const { doc, win } = ouvre();
  const { liste } = etatCourant(doc, win);
  const e = liste[0];
  const fausse = CHROMA.find(n => hauteur(n) !== hauteur(e.attendu[1]));
  const feedback = doc.getElementById('jeu-feedback');

  doc.querySelector(`#jeu-palette [data-note="${fausse}"]`).click();
  doc.getElementById('jeu-undo').click();
  assert.equal(remplies(doc).length, 0);

  doc.querySelector(`#jeu-palette [data-note="${fausse}"]`).click();
  for (const note of e.attendu.slice(2)) jouer(doc, note);
  assert.match(feedback.textContent, /✗ 5 \/ 6/);
  assert.match(feedback.textContent, /On continue avec les bonnes notes/);
  assert.equal(remplies(doc)[0].classList.contains('wrong'), true);
  assert.equal(remplies(doc).slice(1).every(s => s.classList.contains('correct')), true);
  assert.equal(doc.getElementById('jeu-score').textContent, '0 / 1');
  assert.equal(doc.getElementById('jeu-new').textContent, 'Étape suivante →');

  /* l'étape 2 s'appuie sur la gamme juste, pas sur la réponse fausse */
  doc.getElementById('jeu-new').click();
  assert.equal(zoneDe(doc).dataset.etape, '2');
  const acquise = [...doc.querySelectorAll('#jeu-acquis .rel-line .scale-note')].map(n => n.textContent);
  assert.deepEqual(acquise, e.attendu);
  assert.equal(feedback.textContent, '');
  reussir(doc, liste[1]);
  assert.match(feedback.textContent, /✓/);
  assert.equal(doc.getElementById('jeu-score').textContent, '1 / 2');
});

test('« Nouvelle gamme » en cours d\'étape tire une autre fondamentale et repart de l\'étape 1', () => {
  const { doc, win } = ouvre();
  const { liste } = etatCourant(doc, win);
  reussir(doc, liste[0]); doc.getElementById('jeu-new').click();
  jouer(doc, liste[1].attendu[1]);
  assert.equal(remplies(doc).length, 1);
  assert.equal(doc.getElementById('jeu-new').textContent, 'Nouvelle gamme →');
  doc.getElementById('jeu-new').click();
  assert.equal(zoneDe(doc).dataset.etape, '1');
  assert.equal(remplies(doc).length, 0);
  assert.equal(doc.getElementById('jeu-acquis').children.length, 0);
  assert.equal(doc.getElementById('jeu-score').textContent, '1 / 1');
});

test('sur toutes les fondamentales, la gamme s\'écrit avec une lettre par degré, sans C♭ ni F♭', () => {
  const { doc, win } = ouvre();
  const vues = new Set();
  for (let i = 0; i < 400 && vues.size < 22; i++){
    doc.getElementById('jeu-new').click();
    const { root, type, liste } = etatCourant(doc, win);
    vues.add(type + root);
    const g = liste[0].attendu;
    assert.equal(new Set(g.map(n => n[0])).size, 7, g.join(' ') + ' répète une lettre');
    assert.ok(!g.includes('C♭') && !g.includes('F♭'), g.join(' '));
    assert.equal(g[0], root);
  }
  assert.equal(vues.size, 22, 'toutes les fondamentales ne sortent pas : ' + [...vues].join(' '));
});
