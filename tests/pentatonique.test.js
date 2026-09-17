'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* le contenu du cours du 17 septembre 2026 : la feuille « Minor Pentatonic
   Scales » (six formes) et With or Without You, joué sur la grille */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CORDES = ['G','D','A','E'];          /* de haut en bas */
/* demi-tons entre la corde de E grave et chaque corde à vide */
const CORDE_DEMI = { E: 0, A: 5, D: 10, G: 15 };

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
      fill: t.getAttribute('fill'),
    }))
    .sort((a, b) => a.x - b.x)
    .map(n => ({ ...n, hauteur: (CHROMA.indexOf(n.corde) + n.fret) % 12,
                 demi: CORDE_DEMI[n.corde] + n.fret }));
}

/* la tablature d'un bloc (l'autre SVG est la boîte de la forme) */
function tablatureDe(doc, id){
  const svg = [...doc.querySelectorAll('#' + id + ' .tab-scroll svg')]
    .find(s => /^Tablature/.test(s.getAttribute('aria-label')));
  assert.ok(svg, id + ' : tablature absente');
  return svg;
}

/* les doigtés écrits sous la tablature, de gauche à droite */
function lireDoigts(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 10.5 && /^\d$/.test(t.textContent))
    .sort((a, b) => +a.getAttribute('x') - +b.getAttribute('x'))
    .map(t => t.textContent);
}

/* la feuille, telle qu'elle est écrite : [corde, case] dans l'ordre, et les
   doigts que la feuille note (dans l'ordre, seulement ceux qu'elle écrit) */
const FEUILLE = {
  'pt-e1': { root: 'A', gamme: ['A','C','D','E','G'],
    notes: [['E',5],['E',8],['A',5],['A',7],['D',5],['D',7],['G',5],['G',7],
            ['G',9],['G',7],['G',5],['D',7],['D',5],['A',7],['A',5],['E',8]],
    doigts: ['1','4','1','3','1','3','1','1','3'] },
  'pt-e2': { root: 'A', gamme: ['A','C','D','E','G'],
    notes: [['E',5],['A',3],['A',5],['A',7],['D',5],['D',7],['D',5],['A',7],
            ['A',5],['A',3],['E',5],['E',3],['E',0],['E',3],['E',5],['A',3]],
    doigts: ['3','1','3','3','1','3','1','3','3','1','0'] },
  'pt-e3': { root: 'A', gamme: ['A','C','D','E','G'],
    notes: [['E',5],['A',3],['A',5],['D',2],['D',5],['G',2],['G',5],['G',2],
            ['D',5],['D',2],['A',5],['A',3],['E',5],['E',3],['E',0],['E',3]],
    doigts: ['4','2','4','1','4','1','4'] },
  'pt-a1': { root: 'D', gamme: ['D','F','G','A','C'],
    notes: [['A',5],['A',8],['D',5],['D',7],['G',5],['G',7],['G',5],['D',7],
            ['D',5],['A',8],['A',5],['E',8],['E',5],['E',8],['A',5]],
    doigts: ['1','4','1','3','1','3','4','1'] },
  'pt-a2': { root: 'D', gamme: ['D','F','G','A','C'],
    notes: [['A',5],['D',3],['D',5],['D',7],['G',5],['G',7],['G',5],['D',7],
            ['D',5],['D',3],['A',5],['A',3],['E',5],['A',3],['A',5]],
    doigts: ['3','1','3','3','1','3','1','3'] },
  'pt-a3': { root: 'D', gamme: ['D','F','G','A','C'],
    notes: [['A',5],['D',3],['D',5],['G',2],['G',5],['G',7],['G',5],['G',2],
            ['D',5],['D',3],['A',5],['A',3],['E',5],['A',3],['A',5]],
    doigts: ['4','2','4','1','1','3','4','1','3','1','3'] },
};

test('la section pentatonique est rendue, visible, avec ses six formes dans l\'ordre de la feuille', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('pentatonique');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /17 septembre 2026/);
  assert.match(sec.querySelector('.rule').textContent, /deux formes/);
  const blocs = [...doc.querySelectorAll('#penta-list .tab-block')];
  assert.deepEqual(blocs.map(b => b.id), Object.keys(FEUILLE));
  blocs.forEach(b => {
    assert.equal(isVisible(b), true, b.id + ' rendu mais pas visible');
    /* la boîte, puis la tablature */
    assert.equal(b.querySelectorAll('.tab-scroll svg').length, 2, b.id);
  });
  /* trois formes sur E, trois sur A, annoncées comme telles */
  const subs = blocs.map(b => b.querySelector('.tab-sub').textContent);
  assert.deepEqual(subs.map(s => /corde de (E|A)/.exec(s)[1]), ['E','E','E','A','A','A']);
});

test('chaque forme reproduit la feuille : mêmes cases, mêmes cordes, même ordre', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, f] of Object.entries(FEUILLE)){
      const svg = tablatureDe(doc, id);
    const notes = lireTablature(svg);
    assert.deepEqual(notes.map(n => [n.corde, n.fret]), f.notes, id + ' : la tablature diverge de la feuille');
    /* la forme part de la fondamentale */
    assert.equal(CHROMA[notes[0].hauteur], f.root, id + ' : ne part pas de la fondamentale');
  }
});

test('chaque forme ne joue que les cinq notes de sa pentatonique mineure', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, f] of Object.entries(FEUILLE)){
      const svg = tablatureDe(doc, id);
    const notes = lireTablature(svg);
    const permises = new Set(f.gamme.map(hauteur));
    for (const n of notes){
      assert.ok(permises.has(n.hauteur),
        `${id} : corde ${n.corde} case ${n.fret} = ${CHROMA[n.hauteur]}, hors de la pentatonique de ${f.root}`);
    }
    /* et les cinq y sont toutes */
    assert.deepEqual([...new Set(notes.map(n => n.hauteur))].sort((a, b) => a - b),
      [...permises].sort((a, b) => a - b), id + ' : une note de la gamme manque');
    /* la montée est bien une montée : la première moitié ne redescend jamais
       avant son sommet */
    const sommet = Math.max(...notes.map(n => n.demi));
    const iSommet = notes.findIndex(n => n.demi === sommet);
    for (let i = 1; i <= iSommet; i++){
      assert.ok(notes[i].demi > notes[i-1].demi, id + ' : la montée redescend avant le sommet');
    }
  }
});

test('les doigtés affichés sont ceux que la feuille écrit, et seulement eux', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, f] of Object.entries(FEUILLE)){
      const svg = tablatureDe(doc, id);
    assert.deepEqual(lireDoigts(svg), f.doigts, id + ' : doigtés différents de la feuille');
  }
});

test('la légende de chaque forme suit sa tablature, en lettres', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
      const svg = tablatureDe(doc, id);
    const legende = svg.closest('.tab-scroll').nextElementSibling;
    assert.ok(legende && legende.classList.contains('tab-note'), id + ' : légende manquante');
    const affichees = [...legende.querySelectorAll('b')].map(b => hauteur(b.textContent.trim()));
    assert.deepEqual(affichees, lireTablature(svg).map(n => n.hauteur), id + ' : légende et tablature divergent');
  }
});

test('la boîte de chaque forme porte toutes les cases jouées, avec le bon degré', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const DEG = { 0: '1', 3: '♭3', 5: '4', 7: '5', 10: '♭7' };
  for (const [id, f] of Object.entries(FEUILLE)){
    const pastilles = [...doc.querySelectorAll('#' + id + ' .forme-note')].map(g => ({
      corde: g.dataset.corde, fret: +g.dataset.case, note: g.dataset.note, degre: g.dataset.degre,
    }));
    const attendues = [...new Set(f.notes.map(([c, k]) => c + ':' + k))];
    assert.deepEqual(pastilles.map(p => p.corde + ':' + p.fret), attendues, id + ' : la boîte ne montre pas les cases de la tablature');
    const rootDemi = f.root === 'A' ? 5 : 10;
    for (const p of pastilles){
      assert.equal((CHROMA.indexOf(p.corde) + p.fret) % 12, hauteur(p.note),
        `${id} : ${p.note} ne correspond pas à la case ${p.corde}${p.fret}`);
      const demi = CORDE_DEMI[p.corde] + p.fret - rootDemi;
      const deg = DEG[((demi % 12) + 12) % 12];
      assert.equal(p.degre, demi >= 12 && deg === '1' ? '8' : deg, `${id} : degré de ${p.corde}${p.fret}`);
    }
  }
});

test('With or Without You : la piste sans basse, en fenêtre à part', () => {
  const { doc, win } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('u2');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /17 septembre 2026/);
  const lien = doc.querySelector('#u2 .track-card .play-link');
  assert.ok(lien, 'lien de la piste absent');
  assert.equal(isVisible(lien), true);
  assert.equal(lien.getAttribute('href'), 'https://www.youtube.com/watch?v=fasjHFnkMwE');
  assert.equal(lien.target, '_blank');
  assert.equal(lien.rel, 'noopener');
  const appels = [];
  win.open = (url, nom) => { appels.push({ url, nom }); return { focus(){} }; };
  lien.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.deepEqual(appels, [{ url: lien.href, nom: 'piste-batterie' }]);
  /* les consignes du cours : décompte, croches, personne d'autre sur les accords */
  assert.match(sec.querySelector('.rule').textContent, /personne d'autre ne joue les accords/);
  const etapes = [...sec.querySelectorAll('.steps li')].map(li => li.textContent);
  assert.equal(etapes.length, 5);
  assert.match(etapes[0], /décompte/);
  assert.match(etapes[1], /Huit croches par mesure/);
});

test('With or Without You : D A Bm G, huit croches sur la fondamentale, une mesure chacun', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svg = doc.querySelector('#u2-tab .tab-scroll svg');
  assert.ok(svg, 'tablature absente');
  const accords = [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 12.5 && +t.getAttribute('y') < 30)
    .map(t => t.textContent);
  assert.deepEqual(accords, ['D', 'A', 'Bm', 'G']);
  const notes = lireTablature(svg);
  assert.equal(notes.length, 32, 'quatre mesures de huit croches');
  const fondamentales = ['D', 'A', 'B', 'G'];
  notes.forEach((n, i) => {
    assert.equal(CHROMA[n.hauteur], fondamentales[Math.floor(i / 8)],
      `croche ${i + 1} : ${CHROMA[n.hauteur]} au lieu de ${fondamentales[Math.floor(i / 8)]}`);
  });
  /* les positions données en cours : D case 5 (corde de A), A case 5 (corde de E) */
  assert.deepEqual([notes[0].corde, notes[0].fret], ['A', 5]);
  assert.deepEqual([notes[8].corde, notes[8].fret], ['E', 5]);
});
