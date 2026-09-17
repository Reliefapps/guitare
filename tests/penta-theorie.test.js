'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ la section 4 de l'onglet théorie : la pentatonique ============ */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
/* hauteur d'un nom écrit, altérations comprises (# ou ♯, b ou ♭) */
function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}
/* le nom de la palette (à dièses) qui sonne comme la note épelée */
const surPalette = nom => CHROMA[hauteur(nom)];
const ouvre = () => { const r = load(); openTab(r.doc, 'theorie'); return r; };
/* les recettes exposées par la page, recopiées dans des tableaux de ce côté-ci
   (deepEqual strict refuse les tableaux venus d'un autre contexte) */
const th = win => ({
  penta: (r, t) => [...win.theorie.penta(r, t)],
  gammeMineure: r => [...win.theorie.gammeMineure(r)],
});
/* un clic sur un élément SVG : jsdom ne donne click() qu'aux éléments HTML */
const clic = (doc, el) => el.dispatchEvent(new doc.defaultView.MouseEvent('click', { bubbles:true }));

test('la section 4 et son entrée de sommaire sont visibles dans Théorie, et nulle part ailleurs', () => {
  const { doc } = load();
  const sec = doc.getElementById('penta');
  const lien = doc.querySelector('#page-theorie nav.sticky a[href="#penta"]');
  assert.ok(sec, 'section #penta absente');
  assert.ok(lien, 'entrée de sommaire absente');
  assert.equal(lien.textContent, '4 · La pentatonique');
  /* onglet guitare au chargement : masquée */
  assert.equal(isVisible(sec), false);
  assert.equal(isVisible(lien), false);
  for (const page of ['basse', 'malaguena', 'library']){
    openTab(doc, page);
    assert.equal(isVisible(sec), false, 'section visible depuis ' + page);
    assert.equal(isVisible(lien), false, 'sommaire visible depuis ' + page);
  }
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(isVisible(lien), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '4');
  assert.equal(sec.querySelector('h2').textContent, 'La pentatonique');
  /* les quatre jeux et l'encadré de liens, dans l'ordre */
  const ordre = [...sec.querySelectorAll('.prog-card, .callout')].map(n => n.id || n.className);
  assert.deepEqual(ordre, ['intrus-zone', 'pj-zone', 'rel-zone', 'box-zone', 'callout']);
});

test('la recette de la pentatonique épelle une lettre par degré', () => {
  const { win } = ouvre();
  const { penta, gammeMineure } = th(win);
  assert.deepEqual(penta('A', 'mineur'), ['A','C','D','E','G']);
  assert.deepEqual(penta('C', 'majeur'), ['C','D','E','G','A']);
  assert.deepEqual(penta('G', 'mineur'), ['G','B♭','C','D','F']);
  assert.deepEqual(penta('E', 'mineur'), ['E','G','A','B','D']);
  assert.deepEqual(penta('D', 'mineur'), ['D','F','G','A','C']);
  assert.deepEqual(penta('F♯', 'mineur'), ['F♯','A','B','C♯','E']);
  assert.deepEqual(penta('D♭', 'majeur'), ['D♭','E♭','F','A♭','B♭']);
  /* la gamme complète aussi : G mineur prend un B♭ et un E♭, jamais A♯ ni D♯ */
  assert.deepEqual(gammeMineure('G'), ['G','A','B♭','C','D','E♭','F']);
  assert.deepEqual(gammeMineure('C♯'), ['C♯','D♯','E','F♯','G♯','A','B']);
});

test('4.1 — A mineur, puis la même gamme avec B et F barrés', () => {
  const { doc } = ouvre();
  const card = doc.getElementById('penta-am');
  assert.equal(isVisible(card), true);
  const lignes = [...card.querySelectorAll('.scale-line')];
  assert.equal(lignes.length, 2);
  const notes = l => [...l.querySelectorAll('.scale-note')].map(n => n.textContent);
  const off   = l => [...l.querySelectorAll('.scale-note.off')].map(n => n.textContent);
  const ints  = l => [...l.querySelectorAll('.scale-int')].map(n => n.firstChild.textContent);
  /* la gamme complète, W et H comme en section 1, B et F retirés */
  assert.deepEqual(notes(lignes[0]), ['A','B','C','D','E','F','G','A']);
  assert.deepEqual(off(lignes[0]), ['B','F']);
  assert.deepEqual(ints(lignes[0]), ['W','H','W','W','H','W','W']);
  /* ce qui reste : cinq notes, plus aucun demi-ton */
  assert.deepEqual(notes(lignes[1]), ['A','C','D','E','G','A']);
  assert.deepEqual(off(lignes[1]), []);
  assert.deepEqual(ints(lignes[1]), ['W+H','W','W','W+H','W']);
  /* Am7 + D, et la formule posée sur E, D et G */
  const seqs = [...doc.querySelectorAll('#penta .seq')].map(sq => [
    sq.querySelector('.seq-chord').textContent,
    [...sq.querySelectorAll('b')].map(b => b.textContent).join(' ')]);
  assert.deepEqual(seqs, [
    ['A mineur penta', 'A C D E G'], ['= Am7 + D', 'A C E G D'],
    ['Em', 'E G A B D'], ['Dm', 'D F G A C'], ['Gm', 'G B♭ C D F']]);
  const txt = doc.getElementById('penta').textContent;
  assert.match(txt, /1 · ♭3 · 4 · 5 · ♭7/);
  assert.match(txt, /1 · 2 · 3 · 5 · 6/);
});

/* ------------ 4.2 barre les deux intruses ------------ */
const chips = doc => [...doc.querySelectorAll('#intrus-line .scale-note')];

test('4.2 — une gamme mineure complète est tirée, retirer le 2ᵉ et le 6ᵉ degré la valide', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('intrus-zone');
  assert.equal(isVisible(zone), true);
  const root = zone.dataset.root;
  assert.ok(root, 'aucune fondamentale tirée');
  assert.match(doc.getElementById('intrus-prompt').textContent, new RegExp(root + ' mineur'));
  assert.deepEqual(chips(doc).map(c => c.textContent), th(win).gammeMineure(root));
  assert.equal(chips(doc).every(c => !c.disabled), true);

  chips(doc)[1].click();
  assert.equal(chips(doc)[1].classList.contains('pick'), true);
  chips(doc)[5].click();
  const feedback = doc.getElementById('intrus-feedback');
  assert.match(feedback.textContent, /✓/);
  assert.match(feedback.textContent, new RegExp(th(win).penta(root, 'mineur').join(' · ')));
  assert.equal(doc.getElementById('intrus-score').textContent, '1 / 1');
  assert.equal(chips(doc).every(c => c.disabled), true);
  assert.deepEqual(chips(doc).map(c => c.classList.contains('off')),
    [false, true, false, false, false, true, false]);
});

test('4.2 — une mauvaise note est signalée, et une nouvelle gamme repart de zéro', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('intrus-zone');
  const g = th(win).gammeMineure(zone.dataset.root);
  /* une sélection se défait en re-cliquant */
  chips(doc)[0].click();
  chips(doc)[0].click();
  assert.equal(chips(doc).some(c => c.classList.contains('pick')), false);

  chips(doc)[0].click();
  chips(doc)[5].click();
  const feedback = doc.getElementById('intrus-feedback');
  assert.match(feedback.textContent, /✗/);
  assert.match(feedback.textContent, new RegExp('retirer ' + g[1] + ' et ' + g[5]));
  assert.equal(chips(doc)[0].classList.contains('wrong'), true);
  assert.equal(chips(doc)[5].classList.contains('correct'), true);
  assert.equal(doc.getElementById('intrus-score').textContent, '0 / 1');

  doc.getElementById('intrus-new').click();
  assert.equal(feedback.textContent, '');
  assert.equal(chips(doc).length, 7);
  assert.equal(chips(doc).every(c => !c.disabled && c.classList.length === 1), true);
  assert.equal(doc.getElementById('intrus-score').textContent, '0 / 1');
});

/* ------------ 4.3 trouve la penta ------------ */

test('4.3 — fondamentale et type donnés, quatre notes à trouver, la formule sous les yeux', () => {
  const { doc } = ouvre();
  const zone = doc.getElementById('pj-zone');
  assert.equal(isVisible(zone), true);
  assert.ok(['mineur', 'majeur'].includes(zone.dataset.type));
  assert.ok(zone.dataset.root);
  const enonce = doc.getElementById('pj-prompt').textContent;
  assert.match(enonce, new RegExp(zone.dataset.root));
  assert.match(enonce, zone.dataset.type === 'mineur' ? /1 · ♭3 · 4 · 5 · ♭7/ : /1 · 2 · 3 · 5 · 6/);
  const slots = [...doc.querySelectorAll('#pj-slots .quiz-slot')];
  assert.equal(slots.length, 5);
  assert.equal(slots[0].textContent, zone.dataset.root);
  assert.ok(slots[0].classList.contains('given'));
  /* douze touches, les noires avec leurs deux noms */
  const palette = [...doc.querySelectorAll('#pj-palette button')];
  assert.deepEqual(palette.map(b => b.dataset.note), CHROMA);
  assert.equal(palette.find(b => b.dataset.note === 'A#').textContent, 'A♯/B♭');
  assert.equal(palette.find(b => b.dataset.note === 'A').textContent, 'A');
  assert.equal(doc.getElementById('pj-undo').textContent, '← Effacer');
  assert.equal(doc.getElementById('pj-new').textContent, 'Nouvelle penta →');
});

test('4.3 — les quatre notes justes valident, et se réécrivent avec la bonne orthographe', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('pj-zone');
  const attendu = th(win).penta(zone.dataset.root, zone.dataset.type);
  for (const note of attendu.slice(1)){
    doc.querySelector(`#pj-palette [data-note="${surPalette(note)}"]`).click();
  }
  const feedback = doc.getElementById('pj-feedback');
  assert.match(feedback.textContent, /✓/);
  assert.match(feedback.textContent, new RegExp("c'est " + attendu.join(' · ')));
  assert.equal(doc.getElementById('pj-score').textContent, '1 / 1');
  const remplies = [...doc.querySelectorAll('#pj-slots .quiz-slot.filled')];
  assert.deepEqual(remplies.map(s => s.textContent), attendu.slice(1));
  remplies.forEach(s => assert.ok(s.classList.contains('correct')));
  assert.equal(doc.querySelector('#pj-palette button').disabled, true);
  assert.equal(doc.getElementById('pj-undo').disabled, true);
});

test('4.3 — une note fausse est signalée, effacer corrige, une nouvelle penta réinitialise', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('pj-zone');
  const attendu = th(win).penta(zone.dataset.root, zone.dataset.type);
  const fausse = CHROMA.find(n => hauteur(n) !== hauteur(attendu[1]));

  doc.querySelector(`#pj-palette [data-note="${fausse}"]`).click();
  doc.getElementById('pj-undo').click();
  assert.equal(doc.querySelectorAll('#pj-slots .quiz-slot.filled').length, 0);

  doc.querySelector(`#pj-palette [data-note="${fausse}"]`).click();
  for (const note of attendu.slice(2)){
    doc.querySelector(`#pj-palette [data-note="${surPalette(note)}"]`).click();
  }
  const feedback = doc.getElementById('pj-feedback');
  assert.match(feedback.textContent, /✗ 3 \/ 4/);
  const remplies = [...doc.querySelectorAll('#pj-slots .quiz-slot.filled')];
  assert.equal(remplies[0].classList.contains('wrong'), true);
  assert.equal(remplies.slice(1).every(s => s.classList.contains('correct')), true);

  doc.getElementById('pj-new').click();
  assert.equal(feedback.textContent, '');
  assert.equal(doc.querySelectorAll('#pj-slots .quiz-slot.filled').length, 0);
  assert.equal(doc.querySelector('#pj-palette button').disabled, false);
  assert.equal(doc.getElementById('pj-score').textContent, '0 / 1');
});

test('4.3 — sur toutes les fondamentales, la penta s\'écrit sans doublon de lettre', () => {
  const { doc, win } = ouvre();
  const vues = new Set();
  /* on retire jusqu'à voir toutes les fondamentales des deux types */
  for (let i = 0; i < 400 && vues.size < 24; i++){
    doc.getElementById('pj-new').click();
    const zone = doc.getElementById('pj-zone');
    vues.add(zone.dataset.type + zone.dataset.root);
    const p = th(win).penta(zone.dataset.root, zone.dataset.type);
    assert.equal(new Set(p.map(n => n[0])).size, 5, p.join(' ') + ' répète une lettre');
    assert.equal(p[0], zone.dataset.root);
    assert.match(doc.querySelector('#pj-slots .given').textContent, /^[A-G][♯♭]?$/);
  }
  assert.equal(vues.size, 24, 'toutes les fondamentales ne sortent pas : ' + [...vues].join(' '));
});

/* ------------ 4.4 la relative ------------ */

test('4.4 — une penta est affichée, la relative est un ton et demi plus haut ou plus bas', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('rel-zone');
  assert.equal(isVisible(zone), true);
  const { root, type, cible } = zone.dataset;
  assert.ok(['mineur', 'majeur'].includes(type));
  assert.equal(hauteur(cible), (hauteur(root) + (type === 'mineur' ? 3 : 9)) % 12);
  assert.deepEqual([...doc.querySelectorAll('#rel-notes .scale-note')].map(n => n.textContent),
    th(win).penta(root, type));
  assert.match(doc.getElementById('rel-prompt').textContent,
    type === 'mineur' ? /majeure/ : /mineure/);
  const palette = [...doc.querySelectorAll('#rel-palette button')];
  assert.equal(palette.length, 12);
  assert.ok(palette.some(b => b.dataset.note === cible));
  assert.equal(isVisible(doc.getElementById('rel-compare')), false);

  doc.querySelector(`#rel-palette [data-note="${cible}"]`).click();
  const feedback = doc.getElementById('rel-feedback');
  assert.match(feedback.textContent, /✓/);
  assert.equal(doc.getElementById('rel-score').textContent, '1 / 1');
  assert.equal(palette.every(b => b.disabled), true);
  /* les deux gammes côte à côte : les mêmes cinq notes */
  const compare = doc.getElementById('rel-compare');
  assert.equal(isVisible(compare), true);
  const lignes = [...compare.querySelectorAll('.rel-line')];
  assert.equal(lignes.length, 2);
  const notes = l => [...l.querySelectorAll('.scale-note')].map(n => n.textContent);
  assert.match(lignes[0].textContent, new RegExp('^' + root.replace('♯', '♯')));
  assert.match(lignes[1].textContent, new RegExp('^' + cible));
  assert.deepEqual([...notes(lignes[0])].sort(), [...notes(lignes[1])].sort());
});

test('4.4 — une mauvaise réponse montre la bonne, une nouvelle question repart de zéro', () => {
  const { doc } = ouvre();
  const zone = doc.getElementById('rel-zone');
  const mauvaise = [...doc.querySelectorAll('#rel-palette button')]
    .find(b => b.dataset.note !== zone.dataset.cible);
  mauvaise.click();
  const feedback = doc.getElementById('rel-feedback');
  assert.match(feedback.textContent, new RegExp("✗ C'était " + zone.dataset.cible));
  assert.equal(mauvaise.classList.contains('wrong'), true);
  assert.equal(doc.querySelector(`#rel-palette [data-note="${zone.dataset.cible}"]`)
    .classList.contains('correct'), true);
  assert.equal(doc.getElementById('rel-score').textContent, '0 / 1');
  assert.equal(isVisible(doc.getElementById('rel-compare')), true);

  doc.getElementById('rel-new').click();
  assert.equal(feedback.textContent, '');
  assert.equal(isVisible(doc.getElementById('rel-compare')), false);
  assert.equal([...doc.querySelectorAll('#rel-palette button')].every(b => !b.disabled), true);
  assert.equal(doc.getElementById('rel-score').textContent, '0 / 1');
});

/* ------------ 4.5 où poser la boîte ------------ */

/* les six cordes de haut en bas, en demi-tons absolus : Mi aigu → Mi grave */
const CORDES = [64, 59, 55, 50, 45, 40];
const FRETS = 15;
function pastilles(doc){
  return [...doc.querySelectorAll('#box-fretboard .note-g')].map((g, k) => ({
    g, corde: Math.floor(k / (FRETS + 1)), fret: k % (FRETS + 1) }));
}
const grave = (doc, fret) => pastilles(doc).find(p => p.corde === 5 && p.fret === fret).g;

test('4.5 — la tonalité est annoncée, la corde de E grave est cliquable sur 13 cases', () => {
  const { doc } = ouvre();
  const zone = doc.getElementById('box-zone');
  assert.equal(isVisible(zone), true);
  const { root } = zone.dataset;
  assert.ok(root);
  assert.equal(+zone.dataset.case, (hauteur(root) - hauteur('E') + 12) % 12);
  assert.match(doc.getElementById('box-prompt').textContent, new RegExp(root + 'm'));
  const ps = pastilles(doc);
  assert.equal(ps.length, 6 * (FRETS + 1));
  const cibles = ps.filter(p => p.g.classList.contains('cible'));
  assert.equal(cibles.length, 13);
  assert.equal(cibles.every(p => p.corde === 5 && p.fret <= 12), true);
  /* rien n'est encore nommé, ni sur cette corde ni ailleurs */
  assert.equal(ps.every(p => p.g.querySelector('text').style.display === 'none'), true);
  assert.equal(doc.querySelectorAll('#box-fretboard [data-box]').length, 0);
});

test('4.5 — la bonne case fait apparaître la boîte position 1, fondamentales cerclées', () => {
  const { doc, win } = ouvre();
  const zone = doc.getElementById('box-zone');
  const f = +zone.dataset.case;
  clic(doc, grave(doc, f));
  const feedback = doc.getElementById('box-feedback');
  assert.match(feedback.textContent, /✓/);
  assert.match(feedback.textContent, new RegExp('case ' + f));
  assert.equal(doc.getElementById('box-score').textContent, '1 / 1');

  const boite = pastilles(doc).filter(p => p.g.dataset.box === '1');
  assert.equal(boite.length, 12);
  /* le schéma relatif à la fondamentale : +0 / +3 sur E, B, e ; +0 / +2 sur A, D, G */
  const attendu = [];
  for (const s of [0, 1, 5]) attendu.push([s, f], [s, f + 3]);
  for (const s of [2, 3, 4]) attendu.push([s, f], [s, f + 2]);
  assert.deepEqual(boite.map(p => [p.corde, p.fret]).sort(), attendu.sort());
  /* chaque pastille sonne la note qu'elle annonce, et toutes sont dans la penta */
  const penta = th(win).penta(zone.dataset.root, 'mineur');
  for (const p of boite){
    const nom = p.g.dataset.note;
    assert.ok(penta.includes(nom), nom + ' n\'est pas dans ' + penta.join(' '));
    assert.equal((CORDES[p.corde] + p.fret) % 12, hauteur(nom),
      `corde ${p.corde} case ${p.fret} ne sonne pas ${nom}`);
    assert.equal(p.g.querySelector('text').textContent, nom);
    assert.equal(p.g.querySelector('text').style.display, '');
  }
  /* trois fondamentales, cerclées ; les autres pastilles sont cachées */
  const racines = boite.filter(p => p.g.dataset.deg === '1');
  assert.equal(racines.length, 3);
  racines.forEach(p => assert.equal(p.g.querySelector('circle').getAttribute('stroke'), '#F3EADD'));
  boite.filter(p => p.g.dataset.deg !== '1')
    .forEach(p => assert.equal(p.g.querySelector('circle').getAttribute('stroke'), 'none'));
  assert.equal(pastilles(doc).filter(p => p.g.style.display === 'none').length, 6 * (FRETS + 1) - 12);
});

test('4.5 — une mauvaise case est nommée, le point ne compte qu\'au premier essai', () => {
  const { doc } = ouvre();
  const zone = doc.getElementById('box-zone');
  const f = +zone.dataset.case;
  const mauvaise = (f + 5) % 13;
  clic(doc, grave(doc, mauvaise));
  const feedback = doc.getElementById('box-feedback');
  assert.match(feedback.textContent, /✗ Case /);
  assert.match(feedback.textContent, new RegExp(CHROMA[(4 + mauvaise) % 12].replace('#', '♯')));
  assert.equal(doc.querySelectorAll('#box-fretboard [data-box]').length, 0);
  clic(doc, grave(doc, f));
  assert.match(feedback.textContent, /✓/);
  assert.equal(doc.getElementById('box-score').textContent, '0 / 1');

  doc.getElementById('box-new').click();
  assert.equal(feedback.textContent, '');
  assert.equal(doc.querySelectorAll('#box-fretboard [data-box]').length, 0);
  assert.equal(pastilles(doc).every(p => p.g.style.display === ''), true);
  assert.equal(doc.getElementById('box-score').textContent, '0 / 1');
});

test('4.5 — E est en case 0, et la case 12 est acceptée aussi', () => {
  const { doc } = ouvre();
  const zone = doc.getElementById('box-zone');
  for (let i = 0; i < 300 && zone.dataset.root !== 'E'; i++) doc.getElementById('box-new').click();
  assert.equal(zone.dataset.root, 'E', 'E ne sort jamais');
  assert.equal(zone.dataset.case, '0');
  clic(doc, grave(doc, 12));
  assert.match(doc.getElementById('box-feedback').textContent, /✓/);
  /* la boîte tient dans les cases 12 à 15 */
  const cases = pastilles(doc).filter(p => p.g.dataset.box === '1').map(p => p.fret);
  assert.deepEqual([Math.min(...cases), Math.max(...cases)], [12, 15]);
});

/* ------------ 4.6 les liens ------------ */

test('4.6 — l\'encadré mène aux formes de la basse et aux gammes de La, sans recharger', () => {
  const { doc } = ouvre();
  const callout = doc.querySelector('#penta .callout');
  assert.match(callout.textContent, /joue la gamme de A mineur complète, puis la même en sautant B et F/);
  const versBasse = callout.querySelector('a[data-goto="basse"][data-anchor="pentatonique"]');
  assert.ok(versBasse, 'lien vers les six formes absent');
  versBasse.click();
  assert.equal(doc.getElementById('page-basse').hidden, false);
  assert.equal(doc.getElementById('page-theorie').hidden, true);
  assert.equal(isVisible(doc.getElementById('pentatonique')), true);

  openTab(doc, 'theorie');
  const versGuitare = callout.querySelector('a[data-goto="guitare"][data-anchor="gammes"]');
  assert.ok(versGuitare, 'lien vers les gammes de La absent');
  versGuitare.click();
  assert.equal(doc.getElementById('page-guitare').hidden, false);
  assert.equal(isVisible(doc.getElementById('gammes')), true);
});

test('les jeux de la section 4 n\'interfèrent ni entre eux ni avec ceux des sections 2 et 3', () => {
  const { doc } = ouvre();
  chips(doc)[1].click();
  chips(doc)[5].click();
  assert.equal(doc.getElementById('intrus-score').textContent, '1 / 1');
  for (const id of ['quiz-score', 'acc-score', 'pj-score', 'rel-score', 'box-score']){
    assert.equal(doc.getElementById(id).textContent, '', id + ' a bougé');
  }
  assert.equal(doc.querySelectorAll('#pj-slots .quiz-slot.filled').length, 0);
  assert.equal(doc.querySelector('#quiz-palette button').disabled, false);
});
