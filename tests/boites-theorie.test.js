'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ la section 5 de l'onglet théorie : les boîtes 1, 4 et 5 de A mineur ============ */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
/* les six cordes de haut en bas, en demi-tons absolus : Mi aigu → Mi grave */
const CORDES = [64, 59, 55, 50, 45, 40];
const FRETS = 12;          /* les manches des boîtes */
const FRETS_JEU = 15;      /* celui du jeu « Où poser la boîte » */
const PENTA = ['A', 'C', 'D', 'E', 'G'];
/* chaque degré de la pentatonique mineure, en demi-tons depuis la fondamentale */
const DEMI = { '1':0, '♭3':3, '4':5, '5':7, '♭7':10 };
const PISTE = 'https://www.youtube.com/watch?v=22mWUkAi0PI';

const ouvre = () => { const r = load(); openTab(r.doc, 'theorie'); return r; };
function pastilles(doc, id){
  return [...doc.querySelectorAll('#' + id + ' .note-g')].map((g, k) => ({
    g, corde: Math.floor(k / (FRETS + 1)), fret: k % (FRETS + 1) }));
}
const visibles = ps => ps.filter(p => p.g.style.display !== 'none');

test('la section 5 et son entrée de sommaire sont visibles dans Théorie, et nulle part ailleurs', () => {
  const { doc } = load();
  const sec = doc.getElementById('boites');
  const lien = doc.querySelector('#page-theorie nav.sticky a[href="#boites"]');
  assert.ok(sec, 'section #boites absente');
  assert.ok(lien, 'entrée de sommaire absente');
  assert.equal(lien.textContent, '5 · Les boîtes 1, 4 et 5');
  assert.equal(isVisible(sec), false);
  for (const page of ['basse', 'malaguena', 'library']){
    openTab(doc, page);
    assert.equal(isVisible(sec), false, 'section visible depuis ' + page);
  }
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(isVisible(lien), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '5');
  assert.equal(sec.querySelector('h2').textContent, 'A mineur : les boîtes 1, 4 et 5');
  /* les dates des deux cours, et la piste avant les boîtes, avant l'exercice, avant la consigne de travail */
  assert.match(sec.querySelector('.hint').textContent, /21 septembre 2026/);
  assert.match(sec.querySelector('.hint').textContent, /28 septembre 2026/);
  assert.match(sec.querySelector('.hint').textContent, /boîte 5.*cases 2 à 5/);
  const ordre = [...sec.querySelectorAll('.track-card, .tab-block, .exo-consignes, .callout')].map(n => n.id || n.className);
  assert.deepEqual(ordre, ['boites-track', 'boite-1', 'boite-4', 'boite-5', 'prog-legend exo-consignes', 'boites-technique', 'callout']);
});

test('la piste d\'improvisation du cours s\'ouvre dans un nouvel onglet', () => {
  const { doc } = ouvre();
  const lien = doc.getElementById('boites-link');
  assert.ok(lien, 'lien de la piste absent');
  assert.equal(isVisible(lien), true);
  assert.equal(lien.getAttribute('href'), PISTE);
  assert.equal(lien.target, '_blank');
  assert.equal(lien.rel, 'noopener');
  assert.ok(lien.classList.contains('play-link'));
  assert.match(doc.querySelector('#boites-track .track-meta').textContent, /A mineur/);
});

/* les trois boîtes : douze pastilles chacune, entre les cases annoncées */
const BOITES = [
  { id:'boite-1', svg:'boite-svg-1', titre:'Boîte 1', cases:[5, 8], racines:3,
    /* [corde, case] : +0 / +3 sur E, B, e ; +0 / +2 sur A, D, G, depuis la case 5 */
    attendu:[[5,5],[5,8],[4,5],[4,7],[3,5],[3,7],[2,5],[2,7],[1,5],[1,8],[0,5],[0,8]] },
  /* la même forme que cases 12 à 15, une octave plus bas : les cordes à vide en font partie */
  { id:'boite-4', svg:'boite-svg-4', titre:'Boîte 4', cases:[0, 3], racines:2,
    attendu:[[5,0],[5,3],[4,0],[4,3],[3,0],[3,2],[2,0],[2,2],[1,1],[1,3],[0,0],[0,3]] },
  /* entre les deux : sa colonne de gauche est celle de droite de la boîte 4,
     sa colonne de droite (tout en case 5) est celle de gauche de la boîte 1 */
  { id:'boite-5', svg:'boite-svg-5', titre:'Boîte 5', cases:[2, 5], racines:3,
    attendu:[[5,3],[5,5],[4,3],[4,5],[3,2],[3,5],[2,2],[2,5],[1,3],[1,5],[0,3],[0,5]] },
];

for (const b of BOITES){
  test(`${b.titre} — douze notes de la pentatonique de A mineur, cases ${b.cases[0]} à ${b.cases[1]}, fondamentales cerclées`, () => {
    const { doc } = ouvre();
    const block = doc.getElementById(b.id);
    assert.ok(block, b.id + ' absent');
    assert.equal(isVisible(block), true);
    assert.equal(block.querySelector('.tab-title').textContent, b.titre);
    assert.match(block.querySelector('.tab-sub').textContent, new RegExp(`cases ${b.cases[0]} à ${b.cases[1]}`));
    const ps = pastilles(doc, b.svg);
    assert.equal(ps.length, 6 * (FRETS + 1), 'le manche partagé n\'est pas construit');
    const boite = visibles(ps);
    assert.equal(boite.length, 12);
    assert.deepEqual(boite.map(p => [p.corde, p.fret]).sort(), [...b.attendu].sort());
    const cases = boite.map(p => p.fret);
    assert.deepEqual([Math.min(...cases), Math.max(...cases)], b.cases);
    for (const p of boite){
      const nom = p.g.dataset.note;
      assert.ok(PENTA.includes(nom), nom + ' n\'est pas dans A C D E G');
      /* chaque pastille sonne la note qu'elle annonce, et le degré suit la note */
      assert.equal((CORDES[p.corde] + p.fret) % 12, CHROMA.indexOf(nom),
        `corde ${p.corde} case ${p.fret} ne sonne pas ${nom}`);
      assert.equal((CHROMA.indexOf('A') + DEMI[p.g.dataset.deg]) % 12, CHROMA.indexOf(nom),
        `degré ${p.g.dataset.deg} pour ${nom}`);
      assert.equal(p.g.dataset.box, b.id.slice(-1));
      const t = p.g.querySelector('text');
      assert.equal(t.textContent, nom);
      assert.equal(t.style.display, '');
      /* la couleur de la note, la même que partout ailleurs */
      assert.equal(p.g.querySelector('circle').getAttribute('fill'), doc.defaultView.NOTE_COLORS[nom]);
    }
    const racines = boite.filter(p => p.g.dataset.deg === '1');
    assert.equal(racines.length, b.racines);
    racines.forEach(p => assert.equal(p.g.dataset.note, 'A'));
    racines.forEach(p => assert.equal(p.g.querySelector('circle').getAttribute('stroke'), '#F3EADD'));
    boite.filter(p => p.g.dataset.deg !== '1')
      .forEach(p => assert.equal(p.g.querySelector('circle').getAttribute('stroke'), 'none'));
    /* la suite de notes sous le manche, de la corde grave à l'aiguë, ne sort pas de la penta */
    const suite = [...block.querySelectorAll('.tab-note')][0];
    const noms = [...suite.querySelectorAll('b')].map(x => x.textContent).filter(x => PENTA.includes(x));
    assert.equal(noms.length, 12);
    /* la suite commence par la note la plus grave de la boîte : corde de E grave, case la plus basse */
    const grave = boite.filter(p => p.corde === 5).sort((a, b) => a.fret - b.fret)[0];
    assert.equal(noms[0], grave.g.dataset.note);
  });
}

test('les boîtes 4, 5 et 1 se suivent sans trou : chaque frontière est une colonne commune', () => {
  const { doc } = ouvre();
  const colonne = (svg, fret) => visibles(pastilles(doc, svg)).filter(p => p.fret === fret)
    .sort((a, b) => a.corde - b.corde).map(p => p.corde + ':' + p.g.dataset.note);
  /* case 3 (et case 2 sur D et G) : la droite de la boîte 4 est la gauche de la boîte 5 */
  const droite4 = [...colonne('boite-svg-4', 3), ...colonne('boite-svg-4', 2).filter(x => /^[23]:/.test(x))].sort();
  const gauche5 = [...colonne('boite-svg-5', 3), ...colonne('boite-svg-5', 2)].sort();
  assert.equal(droite4.length, 6);
  assert.deepEqual(gauche5, droite4);
  /* case 5 : la droite de la boîte 5 est la gauche de la boîte 1, sur les six cordes */
  const droite5 = colonne('boite-svg-5', 5);
  assert.equal(droite5.length, 6);
  assert.deepEqual(colonne('boite-svg-1', 5), droite5);
});

test('l\'exercice se travaille sur la piste, une boîte à la fois, puis les trois', () => {
  const { doc } = ouvre();
  const etapes = [...doc.querySelectorAll('#boites .exo-consignes:not(#boites-technique) .exo-steps li')];
  assert.equal(etapes.length, 7);
  etapes.forEach(li => assert.equal(isVisible(li), true));
  assert.match(etapes[0].textContent, /boîte 1/);
  assert.match(etapes[1].textContent, /boîte 4.*Cases 0 à 3/);
  assert.match(etapes[2].textContent, /boîte 5.*Cases 2 à 5/);
  assert.match(etapes[3].textContent, /Improvise dans la boîte 1/);
  assert.match(etapes[4].textContent, /Improvise dans la boîte 4/);
  assert.match(etapes[5].textContent, /Improvise dans la boîte 5/);
  assert.match(etapes[6].textContent, /Passe de l'une à l'autre/);
  assert.match(etapes[6].textContent, /boîte 4.*boîte 5.*boîte 1/);
});

test('la consigne du cours du 28 septembre : par cœur, puis en picking et au médiator', () => {
  const { doc } = ouvre();
  const bloc = doc.getElementById('boites-technique');
  assert.ok(bloc, 'consigne de travail absente');
  assert.equal(isVisible(bloc), true);
  assert.match(bloc.querySelector('strong').textContent, /28 septembre 2026/);
  const etapes = [...bloc.querySelectorAll('.exo-steps li')];
  assert.equal(etapes.length, 3);
  etapes.forEach(li => assert.equal(isVisible(li), true));
  assert.match(etapes[0].textContent, /Par cœur, avant tout/);
  assert.match(etapes[1].textContent, /picking/);
  assert.match(etapes[2].textContent, /médiator.*barre du fond/);
  /* le picking renvoie aux arpèges de la fiche guitare, qui existent */
  const lien = etapes[1].querySelector('a[data-goto="guitare"][data-anchor="arpeges"]');
  assert.ok(lien, 'lien vers les arpèges absent');
  assert.equal(doc.getElementById('arpeges').closest('.page').id, 'page-guitare');
});

test('l\'encadré mène au jeu de la section 4 et aux gammes de La', () => {
  const { doc } = ouvre();
  const callout = doc.querySelector('#boites .callout');
  const versJeu = callout.querySelector('a[href="#box-zone"]');
  assert.ok(versJeu, 'lien vers « Où poser la boîte » absent');
  assert.ok(doc.getElementById('box-zone'));
  /* les gammes de La sont désormais dans la même page, section 2 */
  const versGammes = callout.querySelector('a[href="#gammes"]');
  assert.ok(versGammes, 'lien vers les gammes de La absent');
  assert.equal(doc.getElementById('gammes').closest('.page').id, 'page-theorie');
  assert.equal(isVisible(doc.getElementById('gammes')), true);
});

test('la section 5 ne touche pas au jeu « Où poser la boîte » de la section 4', () => {
  const { doc } = ouvre();
  const ps = [...doc.querySelectorAll('#box-fretboard .note-g')];
  assert.equal(ps.length, 6 * (FRETS_JEU + 1));
  assert.equal(doc.querySelectorAll('#box-fretboard [data-box]').length, 0);
  assert.equal(ps.every(g => g.style.display === ''), true);
});
