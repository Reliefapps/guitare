'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ la section 6 de l'onglet théorie : le jeu, une question à la fois ============ */

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
const fire = (doc, el) => el.dispatchEvent(new doc.defaultView.Event('change', { bubbles:true }));
const choisir = (doc, id, valeur) => { const el = doc.getElementById('jeu-' + id); el.value = valeur; fire(doc, el); };

/* la réponse attendue, recalculée avec les recettes que la page expose */
function attendu(win, root, type, exo){
  const g = [...win.theorie.gammeDe(root, type)];
  return {
    gamme: g,
    accord: [g[0], g[2], g[4]],
    sept: [g[0], g[2], g[4], g[6]],
    penta: [...win.theorie.penta(root, type)],
  }[exo];
}
const FORMULES = {
  gamme: t => t === 'mineur' ? 'W H W W H W W' : 'W W H W W W H',
  accord: () => '1 · 3 · 5',
  sept: () => '1 · 3 · 5 · 7',
  penta: t => t === 'mineur' ? '1 · ♭3 · 4 · 5 · ♭7' : '1 · 2 · 3 · 5 · 6',
};
const QUESTIONS = {
  gamme: (r, t) => `Trouve la gamme de ${r} ${t}`,
  accord: (r, t) => `Trouve l'accord de ${r} ${t}`,
  sept: (r, t) => `Trouve l'accord de septième de ${r} ${t}`,
  penta: (r, t) => `Trouve la pentatonique ${t === 'mineur' ? 'mineure' : 'majeure'} de ${r}`,
};
function etat(doc, win){
  const { root, type, exo } = zoneDe(doc).dataset;
  return { root, type, exo, attendu: attendu(win, root, type, exo) };
}
function reussir(doc, e){ for (const note of e.attendu.slice(1)) jouer(doc, note); }

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
  const ids = [...doc.querySelectorAll('#page-theorie section')].map(x => x.id);
  assert.deepEqual(ids, ['construire', 'gammes', 'triades', 'penta', 'boites', 'jeu']);
});

test('une question est tirée au chargement : fondamentale donnée, formule sous les yeux, tout au hasard', () => {
  const { doc, win } = ouvre();
  const zone = zoneDe(doc);
  assert.equal(isVisible(zone), true);
  const e = etat(doc, win);
  assert.ok(['mineur', 'majeur'].includes(e.type));
  assert.ok(['gamme', 'accord', 'sept', 'penta'].includes(e.exo));
  assert.match(e.root, /^[A-G][♯♭]?$/);
  assert.equal(doc.getElementById('jeu-prompt').textContent, QUESTIONS[e.exo](e.root, e.type));
  assert.match(doc.getElementById('jeu-consigne').textContent, new RegExp('^' + FORMULES[e.exo](e.type).replace(/[♭·]/g, '.')));
  assert.equal(slots(doc).length, e.attendu.length);
  assert.equal(slots(doc)[0].textContent, e.root);
  assert.ok(slots(doc)[0].classList.contains('given'));
  assert.equal(slots(doc).slice(1).every(s => s.textContent === ''), true);
  /* douze touches, les noires avec leurs deux noms ; les trois sélecteurs au hasard */
  const palette = [...doc.querySelectorAll('#jeu-palette button')];
  assert.deepEqual(palette.map(b => b.dataset.note), CHROMA);
  assert.equal(palette.find(b => b.dataset.note === 'A#').textContent, 'A♯/B♭');
  for (const id of ['root', 'type', 'exo']) assert.equal(doc.getElementById('jeu-' + id).value, '');
  assert.deepEqual([...doc.getElementById('jeu-exo').options].map(o => o.value), ['', 'gamme', 'accord', 'sept', 'penta']);
  assert.equal(doc.getElementById('jeu-new').textContent, 'Nouvelle question →');
});

for (const exo of ['gamme', 'accord', 'sept', 'penta']){
  test(`exercice « ${exo} » — la bonne réponse valide, compte le point, et se réécrit avec la bonne orthographe`, () => {
    const { doc, win } = ouvre();
    choisir(doc, 'exo', exo);
    const e = etat(doc, win);
    assert.equal(e.exo, exo);
    assert.equal(slots(doc).length, { gamme:7, accord:3, sept:4, penta:5 }[exo]);
    reussir(doc, e);
    const feedback = doc.getElementById('jeu-feedback');
    assert.match(feedback.textContent, /✓/);
    assert.match(feedback.textContent, new RegExp("c'est " + e.attendu.join(' · ')));
    assert.deepEqual(remplies(doc).map(s => s.textContent), e.attendu.slice(1));
    remplies(doc).forEach(s => assert.ok(s.classList.contains('correct')));
    assert.equal(doc.getElementById('jeu-score').textContent, '1 / 1');
    assert.equal(doc.querySelector('#jeu-palette button').disabled, true);
    assert.equal(doc.getElementById('jeu-undo').disabled, true);
    /* la question suivante garde l'exercice choisi et le score */
    doc.getElementById('jeu-new').click();
    assert.equal(zoneDe(doc).dataset.exo, exo);
    assert.equal(remplies(doc).length, 0);
    assert.equal(feedback.textContent, '');
    assert.equal(doc.getElementById('jeu-score').textContent, '1 / 1');
  });
}

test('l\'accord de septième nomme Am7 ou Cmaj7, l\'accord Am ou C', () => {
  const { doc, win } = ouvre();
  choisir(doc, 'type', 'mineur'); choisir(doc, 'root', 'A'); choisir(doc, 'exo', 'sept');
  reussir(doc, etat(doc, win));
  assert.match(doc.getElementById('jeu-feedback').textContent, /Am7, c'est A · C · E · G/);
  choisir(doc, 'type', 'majeur'); choisir(doc, 'root', 'C'); choisir(doc, 'exo', 'accord');
  reussir(doc, etat(doc, win));
  assert.match(doc.getElementById('jeu-feedback').textContent, /C, c'est C · E · G/);
  choisir(doc, 'exo', 'sept');
  reussir(doc, etat(doc, win));
  assert.match(doc.getElementById('jeu-feedback').textContent, /Cmaj7, c'est C · E · G · B/);
});

test('une note fausse est signalée, effacer corrige, une nouvelle question réinitialise', () => {
  const { doc, win } = ouvre();
  choisir(doc, 'exo', 'gamme');
  const e = etat(doc, win);
  const fausse = CHROMA.find(n => hauteur(n) !== hauteur(e.attendu[1]));
  const feedback = doc.getElementById('jeu-feedback');

  doc.querySelector(`#jeu-palette [data-note="${fausse}"]`).click();
  doc.getElementById('jeu-undo').click();
  assert.equal(remplies(doc).length, 0);

  doc.querySelector(`#jeu-palette [data-note="${fausse}"]`).click();
  for (const note of e.attendu.slice(2)) jouer(doc, note);
  assert.match(feedback.textContent, /✗ 5 \/ 6/);
  assert.match(feedback.textContent, new RegExp("c'est " + e.attendu.join(' · ')));
  assert.equal(remplies(doc)[0].classList.contains('wrong'), true);
  assert.equal(remplies(doc).slice(1).every(s => s.classList.contains('correct')), true);
  assert.equal(doc.getElementById('jeu-score').textContent, '0 / 1');

  doc.getElementById('jeu-new').click();
  assert.equal(feedback.textContent, '');
  assert.equal(remplies(doc).length, 0);
  assert.equal(doc.querySelector('#jeu-palette button').disabled, false);
  assert.equal(doc.getElementById('jeu-score').textContent, '0 / 1');
});

test('on peut fixer la fondamentale, le type et l\'exercice ; changer un choix relance la question', () => {
  const { doc, win } = ouvre();
  const zone = zoneDe(doc);
  choisir(doc, 'type', 'mineur');
  choisir(doc, 'root', 'E');
  choisir(doc, 'exo', 'penta');
  assert.deepEqual([zone.dataset.root, zone.dataset.type, zone.dataset.exo], ['E', 'mineur', 'penta']);
  assert.equal(doc.getElementById('jeu-prompt').textContent, 'Trouve la pentatonique mineure de E');
  assert.equal(slots(doc).length, 5);
  assert.equal(doc.getElementById('jeu-score').textContent, '');
  /* les choix tiennent d'une question à l'autre */
  doc.getElementById('jeu-new').click();
  assert.deepEqual([zone.dataset.root, zone.dataset.type, zone.dataset.exo], ['E', 'mineur', 'penta']);
  reussir(doc, etat(doc, win));
  assert.match(doc.getElementById('jeu-feedback').textContent, /E · G · A · B · D/);
  /* B majeur, la gamme : la question et la formule changent */
  choisir(doc, 'type', 'majeur');
  assert.equal(doc.getElementById('jeu-root').value, 'E', 'E existe aussi en majeur, il reste');
  choisir(doc, 'root', 'B');
  choisir(doc, 'exo', 'gamme');
  assert.equal(doc.getElementById('jeu-prompt').textContent, 'Trouve la gamme de B majeur');
  assert.match(doc.getElementById('jeu-consigne').textContent, /^W W H W W W H/);
  reussir(doc, etat(doc, win));
  assert.match(doc.getElementById('jeu-feedback').textContent, /B · C♯ · D♯ · E · F♯ · G♯ · A♯/);
});

test('la liste des fondamentales suit le type, et une fondamentale d\'un seul type impose ce type', () => {
  const { doc } = ouvre();
  const zone = zoneDe(doc);
  const root = doc.getElementById('jeu-root');
  const options = () => [...root.options].map(o => o.value).filter(Boolean);
  /* au hasard : l'union, dans l'ordre chromatique, sans doublon */
  assert.deepEqual(options(), ['C','C♯','D♭','D','E♭','E','F','F♯','G','G♯','A♭','A','B♭','B']);
  choisir(doc, 'type', 'mineur');
  assert.deepEqual(options(), ['A','E','B','F♯','C♯','G♯','D','G','C','F','B♭']);
  choisir(doc, 'type', 'majeur');
  assert.deepEqual(options(), ['C','G','D','A','E','B','F','B♭','E♭','A♭','D♭']);
  /* C♯ n'existe qu'en mineur : le choisir avec le type au hasard impose le mineur */
  choisir(doc, 'type', '');
  choisir(doc, 'root', 'C♯');
  for (let i = 0; i < 5; i++){
    doc.getElementById('jeu-new').click();
    assert.equal(zone.dataset.root, 'C♯');
    assert.equal(zone.dataset.type, 'mineur');
  }
  /* revenir en majeur fait sauter C♯, qui n'y est pas : retour au hasard */
  choisir(doc, 'type', 'majeur');
  assert.equal(root.value, '');
  assert.ok(options().includes(zone.dataset.root));
  assert.equal(zone.dataset.type, 'majeur');
});

test('sur toutes les fondamentales, la gamme s\'écrit avec une lettre par degré, sans C♭ ni F♭', () => {
  const { doc, win } = ouvre();
  choisir(doc, 'exo', 'gamme');
  const vues = new Set();
  for (let i = 0; i < 400 && vues.size < 22; i++){
    doc.getElementById('jeu-new').click();
    const e = etat(doc, win);
    vues.add(e.type + e.root);
    assert.equal(new Set(e.attendu.map(n => n[0])).size, 7, e.attendu.join(' ') + ' répète une lettre');
    assert.ok(!e.attendu.includes('C♭') && !e.attendu.includes('F♭'), e.attendu.join(' '));
    assert.equal(e.attendu[0], e.root);
  }
  assert.equal(vues.size, 22, 'toutes les fondamentales ne sortent pas : ' + [...vues].join(' '));
});
