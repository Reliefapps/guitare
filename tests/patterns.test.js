'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* le contenu du cours du 24 septembre 2026 : la feuille « 8th Notes
   Patterns » (patterns 1 à 4) et le riff de I Wanna Be Your Dog */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CORDES = ['G','D','A','E'];          /* de haut en bas */

function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}

/* les notes d'une tablature, relues depuis le SVG */
function lireTablature(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => t.getAttribute('text-anchor') === 'middle'
              && +t.getAttribute('font-size') === 12.5
              && /^\d+$/.test(t.textContent)
              && +t.getAttribute('y') > 30)
    .map(t => ({
      x: +t.getAttribute('x'),
      corde: CORDES[Math.round((+t.getAttribute('y') - 34) / 20)],
      fret: +t.textContent,
    }))
    .sort((a, b) => a.x - b.x)
    .map(n => ({ ...n, hauteur: (CHROMA.indexOf(n.corde) + n.fret) % 12 }));
}

/* les accords écrits au-dessus, de gauche à droite */
function lireAccords(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 12.5 && +t.getAttribute('y') < 30)
    .sort((a, b) => +a.getAttribute('x') - +b.getAttribute('x'))
    .map(t => t.textContent);
}

/* les doigtés écrits sous la tablature, de gauche à droite */
function lireDoigts(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 10.5 && /^\d$/.test(t.textContent))
    .sort((a, b) => +a.getAttribute('x') - +b.getAttribute('x'))
    .map(t => t.textContent);
}

const tabsDe = (doc, id) => [...doc.querySelectorAll('#' + id + ' .tab-scroll svg')];

/* la feuille, telle qu'elle est écrite (coordonnées relevées avec
   pdftotext -bbox) : une ligne de tablature = quatre mesures de huit
   croches ; les accords et les doigts, seulement ceux que la feuille note */
const FEUILLE = {
  'pa-1': { lignes: [{
      notes: [['E',5],['E',5],['E',5],['E',5],['E',8],['E',8],['E',8],['E',8],
              ['A',5],['A',5],['A',5],['A',5],['A',5],['A',7],['D',5],['A',7],
              ['E',5],['E',5],['E',5],['E',5],['A',5],['A',5],['A',5],['A',5],
              ['E',8],['E',8],['E',8],['E',8],['A',5],['A',7],['D',5],['A',7]],
      accords: ['Am','C','Dm','Am','Dm','C'],
      doigts: ['1','4','1','3','1'] }] },
  'pa-2': { lignes: [{
      notes: [['E',5],['E',5],['E',5],['E',5],['A',7],['A',7],['A',7],['A',7],
              ['A',5],['A',5],['A',5],['A',5],['E',8],['E',8],['A',5],['A',7],
              ['E',5],['E',5],['E',5],['E',5],['A',7],['A',7],['A',7],['A',7],
              ['A',5],['A',5],['A',5],['A',5],['D',7],['D',7],['D',5],['A',7]],
      accords: ['Am','Em','Dm','C','Am','Em','Dm'],
      doigts: ['1','3','1','4','1','3','3','1','3'] }] },
  'pa-3': { lignes: [{
      notes: [['D',7],['D',7],['A',7],['A',7],['D',5],['D',5],['A',7],['A',7],
              ['A',5],['A',5],['A',5],['A',5],['E',8],['E',8],['A',5],['A',7],
              ['D',7],['D',7],['A',7],['A',7],['D',5],['D',5],['A',7],['A',7],
              ['A',5],['A',5],['A',5],['A',5],['E',8],['E',8],['E',5],['E',5]],
      accords: ['Am','Dm','Am','Dm'],
      doigts: ['4','3','1','1','4','4','1'] }] },
  'pa-4': { lignes: [{
      notes: [['E',7],['E',7],['A',9],['A',9],['D',7],['D',7],['D',9],['D',9],
              ['E',7],['E',7],['A',9],['A',9],['D',7],['D',7],['D',9],['D',9],
              ['A',7],['A',7],['D',9],['D',9],['G',7],['G',7],['G',9],['G',9],
              ['A',7],['A',7],['D',9],['D',9],['G',7],['G',7],['G',9],['G',9]],
      accords: ['Bm','Em'],
      doigts: ['1','3','1','4'] }, {
      notes: [['E',5],['E',5],['A',7],['A',7],['D',5],['D',5],['D',7],['D',7],
              ['E',5],['E',5],['A',7],['A',7],['D',5],['D',5],['D',7],['D',7],
              ['A',5],['A',5],['D',7],['D',7],['G',5],['G',5],['G',7],['G',7],
              ['A',5],['A',5],['D',7],['D',7],['G',5],['G',5],['G',7],['G',7]],
      accords: ['A','D'],
      doigts: [] }] },
};

test('la section des patterns est rendue, visible, avec ses quatre patterns dans l\'ordre de la feuille', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('patterns');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /24 septembre 2026/);
  assert.match(sec.querySelector('.rule').textContent, /patterns 1, 2 et 3/);
  const blocs = [...doc.querySelectorAll('#patterns-list .tab-block')];
  assert.deepEqual(blocs.map(b => b.id), Object.keys(FEUILLE));
  blocs.forEach(b => {
    assert.equal(isVisible(b), true, b.id + ' rendu mais pas visible');
    assert.equal(b.querySelectorAll('.tab-scroll svg').length, FEUILLE[b.id].lignes.length, b.id);
  });
});

test('chaque pattern reproduit la feuille : mêmes cases, mêmes cordes, mêmes accords, même ordre', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, pa] of Object.entries(FEUILLE)){
    const svgs = tabsDe(doc, id);
    pa.lignes.forEach((ligne, i) => {
      const notes = lireTablature(svgs[i]);
      assert.deepEqual(notes.map(n => [n.corde, n.fret]), ligne.notes, `${id} ligne ${i + 1} : la tablature diverge de la feuille`);
      assert.deepEqual(lireAccords(svgs[i]), ligne.accords, `${id} ligne ${i + 1} : accords`);
      assert.deepEqual(lireDoigts(svgs[i]), ligne.doigts, `${id} ligne ${i + 1} : doigtés différents de la feuille`);
    });
  }
});

test('quatre mesures de huit croches par ligne, ligaturées par quatre', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
    for (const svg of tabsDe(doc, id)){
      const et = [...svg.querySelectorAll('text')].filter(t => t.textContent === 'et');
      assert.equal(et.length, 16, id + ' : 4 mesures × 4 contretemps');
      /* 4 mesures × 2 groupes × 3 liaisons = 24 traits de liaison */
      const liaisons = [...svg.querySelectorAll('line')]
        .filter(l => l.getAttribute('stroke') === '#DFD6C6' && l.getAttribute('x2') - l.getAttribute('x1') < 20);
      assert.equal(liaisons.length, 24, id + ' : les croches se lisent par groupes de quatre');
    }
  }
});

test('les patterns 1, 2 et 3 ne jouent que la pentatonique mineure de A', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const permises = new Set(['A','C','D','E','G'].map(hauteur));
  for (const id of ['pa-1', 'pa-2', 'pa-3']){
    for (const n of lireTablature(tabsDe(doc, id)[0])){
      assert.ok(permises.has(n.hauteur),
        `${id} : corde ${n.corde} case ${n.fret} = ${CHROMA[n.hauteur]}, hors de la pentatonique de A`);
    }
  }
});

test('le pattern 4 dessine 1 · 5 · ♭7 · 8 sur chacun de ses quatre accords', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svgs = tabsDe(doc, 'pa-4');
  const fondamentales = ['B', 'B', 'E', 'E', 'A', 'A', 'D', 'D'];
  const notes = [...lireTablature(svgs[0]), ...lireTablature(svgs[1])];
  notes.forEach((n, i) => {
    const root = hauteur(fondamentales[Math.floor(i / 8)]);
    const deg = [0, 0, 7, 7, 10, 10, 0, 0][i % 8];
    assert.equal((n.hauteur - root + 12) % 12, deg, `croche ${i + 1} : ${CHROMA[n.hauteur]}`);
  });
});

test('la légende de chaque ligne suit sa tablature, en lettres', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
    for (const svg of tabsDe(doc, id)){
      const legende = svg.closest('.tab-scroll').nextElementSibling;
      assert.ok(legende && legende.classList.contains('tab-note'), id + ' : légende manquante');
      const affichees = [...legende.querySelectorAll('b')].map(b => hauteur(b.textContent.trim()));
      assert.deepEqual(affichees, lireTablature(svg).map(n => n.hauteur), id + ' : légende et tablature divergent');
    }
  }
});

test('I Wanna Be Your Dog : le riff G F♯ E sur la corde de A, cases 10 · 9 · 7, le E deux fois plus long', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('stooges');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /24 septembre 2026/);
  /* les deux lignes du chat de Santiago, telles quelles */
  const chat = [...sec.querySelectorAll('.rule .mono')].map(m => m.textContent);
  assert.deepEqual(chat, ['G – F♯ – E – E (main riff)', 'G – E – D – B – C long – E']);
  const svg = doc.querySelector('#stooges-riff .tab-scroll svg');
  assert.ok(svg, 'tablature du riff absente');
  assert.deepEqual(lireAccords(svg), ['G', 'F♯', 'E']);
  const notes = lireTablature(svg);
  assert.equal(notes.length, 16, 'deux mesures de huit croches');
  const attendues = [...Array(4).fill(['A', 10]), ...Array(4).fill(['A', 9]), ...Array(8).fill(['A', 7])];
  assert.deepEqual(notes.map(n => [n.corde, n.fret]), attendues);
  assert.deepEqual([...new Set(notes.map(n => CHROMA[n.hauteur]))], ['G', 'F#', 'E']);
});

test('I Wanna Be Your Dog : la deuxième partie, G E D B C E, sans rythme inventé', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const suite = doc.getElementById('stooges-suite');
  assert.equal(suite.querySelectorAll('svg').length, 0, 'pas de tablature mesurée : les durées ne sont pas connues');
  const seq = [...suite.querySelectorAll('.seq')].map(s => [
    s.querySelector('b').textContent, s.querySelector('.mono').textContent ]);
  assert.deepEqual(seq, [['G','A·10'], ['E','A·7'], ['D','E·10'], ['B','E·7'], ['C','E·8'], ['E','A·7']]);
  /* chaque case donne bien la note annoncée */
  for (const [note, pos] of seq){
    const [corde, fret] = pos.split('·');
    assert.equal(CHROMA[(CHROMA.indexOf(corde) + +fret) % 12], note, pos);
  }
  assert.match(suite.textContent, /tenu longtemps/);
});
