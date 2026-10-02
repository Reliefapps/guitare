'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* la section « Transposer une forme » de la fiche théorie — cours de basse
   du 2 octobre 2026 : l'atelier (une forme glisse d'une tonalité à l'autre)
   et l'entraînement (poser la forme, nommer la tonalité), basse et guitare */

const NATUREL = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function hauteur(nom){
  let h = NATUREL[nom[0]];
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}
/* un degré, en demi-tons depuis la fondamentale */
const DEMI = { '1':0, '♭3':3, '3':4, '4':5, '5':7, '♭7':10 };
const VIDES = { basse:['G','D','A','E'], guitare:['E','B','G','D','A','E'] };
const FRETS = { basse:18, guitare:15 };

/* les pastilles d'une forme posée sur un manche, relues depuis le SVG */
function lireManche(doc, svgId, frets){
  const L = frets + 1;
  return [...doc.querySelectorAll('#' + svgId + ' .note-g')]
    .map((g, k) => ({ g, corde: Math.floor(k / L), fret: k % L }))
    .filter(n => n.g.style.display !== 'none' && n.g.dataset.box)
    .map(n => ({ corde: n.corde, fret: n.fret, note: n.g.dataset.note, deg: n.g.dataset.deg,
      cercle: n.g.querySelector('circle').getAttribute('stroke') !== 'none',
      nomVisible: n.g.querySelector('text').style.display !== 'none' }));
}
const cases = notes => notes.map(n => n.corde + ':' + n.fret).sort();
const clicSVG = (win, el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
function choisir(win, select, valeur){
  select.value = valeur;
  select.dispatchEvent(new win.Event('change', { bubbles: true }));
}
const tr = win => win.theorie.transposer;

test('la section Transposer est dans la théorie, rendue et visible, avec la consigne du cours', () => {
  const { doc } = load();
  const sec = doc.getElementById('transposer');
  assert.ok(sec, 'section absente');
  assert.equal(sec.closest('.page').id, 'page-theorie');
  assert.equal(isVisible(sec), false, 'visible avant d\'ouvrir l\'onglet');
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '7');
  assert.match(sec.querySelector('.hint').textContent, /2 octobre 2026/);
  const regle = sec.querySelector('.rule').textContent;
  assert.match(regle, /toutes les formes/);
  for (const ton of ['Gm', 'Bm', 'Cm', 'Em', 'F♯m']) assert.ok(regle.includes(ton), ton);
  for (const id of ['tr-zone', 'trq-zone', 'tr-methode']){
    assert.equal(isVisible(doc.getElementById(id)), true, id + ' rendu mais pas visible');
  }
  assert.equal(doc.querySelectorAll('#tr-methode .exo-steps li').length, 5);
});

test('les formes proposées sont celles des cours, et rien d\'autre', () => {
  const { win } = load();
  assert.deepEqual([...tr(win).FORMES].map(f => f.id),
    ['b-e1', 'b-e2', 'b-e3', 'b-a1', 'b-a2', 'b-a3', 'b-min', 'b-maj', 'g-1', 'g-4', 'g-5']);
});

test('chaque forme, dans sa tonalité de cours, reproduit la fiche basse case par case', () => {
  const { doc, win } = load();
  const RANG = { G: 0, D: 1, A: 2, E: 3 };
  const PAIRES = { 'b-e1':'pt-e1', 'b-e2':'pt-e2', 'b-e3':'pt-e3', 'b-a1':'pt-a1', 'b-a2':'pt-a2',
                   'b-a3':'pt-a3', 'b-min':'fo-min', 'b-maj':'fo-maj' };
  for (const [id, bloc] of Object.entries(PAIRES)){
    const f = tr(win).FORMES.find(x => x.id === id);
    const f0 = tr(win).caseDe(f, f.ref[0]);
    assert.equal(f0, f.ref[1], id + ' : la case du cours');
    const fiche = [...doc.querySelectorAll('#' + bloc + ' .forme-note')].map(g => ({
      corde: RANG[g.dataset.corde], fret: +g.dataset.case, note: g.dataset.note,
      deg: g.dataset.degre === '8' ? '1' : g.dataset.degre }));
    assert.ok(fiche.length >= 4, bloc + ' introuvable sur la fiche basse');
    const forme = [...f.notes].map(([corde, d, deg]) => ({ corde, fret: f0 + d, deg, note: tr(win).nom(f.ref[0], deg) }));
    const cle = n => `${n.corde}:${n.fret}:${n.deg}:${n.note}`;
    assert.deepEqual(forme.map(cle).sort(), fiche.map(cle).sort(), id + ' diverge de ' + bloc);
  }
});

test('les trois boîtes de guitare, en Am, sont celles de la section 5', () => {
  const { doc, win } = load();
  for (const [id, boite] of [['g-1', '1'], ['g-4', '4'], ['g-5', '5']]){
    const f = tr(win).FORMES.find(x => x.id === id);
    const f0 = tr(win).caseDe(f, 'A');
    assert.equal(f0, f.ref[1], id);
    const section5 = lireManche(doc, 'boite-svg-' + boite, 12);
    assert.equal(section5.length, 12, 'boîte ' + boite + ' introuvable');
    const forme = [...f.notes].map(([corde, d, deg]) => ({ corde, fret: f0 + d, deg, note: tr(win).nom('A', deg) }));
    const cle = n => `${n.corde}:${n.fret}:${n.deg}:${n.note}`;
    assert.deepEqual(forme.map(cle).sort(), section5.map(cle).sort(), id + ' diverge de la boîte ' + boite);
  }
});

test('dans les douze tonalités, chaque forme tient sur le manche et sonne ses degrés', () => {
  const { win } = load();
  for (const f of tr(win).FORMES){
    const tons = [...tr(win).tons(f)];
    assert.equal(tons.length, 12, f.id);
    assert.equal(new Set(tons.map(hauteur)).size, 12, f.id + ' : douze fondamentales différentes');
    let plusBas = Infinity;
    for (const root of tons){
      const f0 = tr(win).caseDe(f, root);
      /* la fondamentale de repère est bien la tonique, sur la corde annoncée */
      assert.equal((hauteur(VIDES[f.instr][f.corde]) + f0) % 12, hauteur(root), `${f.id} ${root}`);
      for (const [corde, d, deg] of f.notes){
        const fret = f0 + d;
        assert.ok(fret >= 0 && fret <= FRETS[f.instr], `${f.id} en ${root} : case ${fret} hors du manche`);
        const h = (hauteur(VIDES[f.instr][corde]) + fret) % 12;
        assert.equal((h - hauteur(root) + 12) % 12, DEMI[deg], `${f.id} en ${root} : corde ${corde} case ${fret} n'est pas ${deg}`);
        /* et le nom écrit désigne la note jouée, une lettre par degré */
        assert.equal(hauteur(tr(win).nom(root, deg)), h, `${f.id} en ${root} : ${deg}`);
      }
      /* la position la plus grave où la forme tient : douze cases plus bas, elle déborde */
      const bas = Math.min(...f.notes.map(n => n[1]));
      if (f0 >= 12) assert.ok(f0 - 12 + bas < 0, `${f.id} en ${root} : tiendrait une octave plus bas`);
      plusBas = Math.min(plusBas, f0 + bas);
    }
    assert.equal(plusBas, 0, f.id + ' : aucune tonalité ne part du sillet');
  }
});

test('les deux exemples du cours : la forme n° 1 en Gm, et Cm deux cases sous Dm', () => {
  const { win } = load();
  const forme = id => tr(win).FORMES.find(x => x.id === id);
  assert.equal(tr(win).caseDe(forme('b-e1'), 'A'), 5);
  assert.equal(tr(win).caseDe(forme('b-e1'), 'G'), 3, 'Gm : la forme de Am, deux cases plus bas');
  assert.equal(tr(win).caseDe(forme('b-a1'), 'D'), 5);
  assert.equal(tr(win).caseDe(forme('b-a1'), 'C'), 3, 'Cm : deux cases sous le D de la corde de A');
  /* les formes n° 2 et 3 vont chercher la corde à vide en Am : en Gm, la forme
     entière ne tient qu'une octave plus haut */
  assert.equal(tr(win).caseDe(forme('b-e2'), 'A'), 5);
  assert.equal(tr(win).caseDe(forme('b-e2'), 'G'), 15);
});

test("l'atelier s'ouvre sur la basse, forme n° 1 en Am, et la forme glisse quand on change de tonalité", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('tr-zone');
  assert.equal(zone.dataset.instr, 'basse');
  assert.equal(zone.dataset.forme, 'b-e1');
  assert.equal(zone.dataset.root, 'A');
  assert.equal(zone.dataset.case, '5');
  assert.equal(isVisible(doc.getElementById('tr-fb-basse')), true);
  assert.equal(isVisible(doc.getElementById('tr-fb-guitare')), false, 'un seul manche à la fois');
  assert.match(doc.getElementById('tr-titre').textContent, /Basse · Forme n° 1 · corde de E — pentatonique mineure de Am/);
  assert.match(doc.getElementById('tr-info').textContent, /corde de E, case 5 — la position du cours/);
  const am = lireManche(doc, 'tr-fb-basse', 18);
  assert.equal(am.length, 9);
  am.forEach(n => assert.equal(n.nomVisible, true));
  assert.deepEqual([...new Set(am.map(n => n.note))].sort(), ['A', 'C', 'D', 'E', 'G']);
  /* les douze tonalités, de C à B, la tonalité en cours marquée */
  const tons = [...doc.querySelectorAll('#tr-palette .quiz-note-btn')];
  assert.deepEqual(tons.map(b => b.textContent),
    ['Cm', 'C♯m', 'Dm', 'E♭m', 'Em', 'Fm', 'F♯m', 'Gm', 'G♯m', 'Am', 'B♭m', 'Bm']);
  assert.deepEqual(tons.filter(b => b.classList.contains('on')).map(b => b.textContent), ['Am']);

  /* Gm : tout descend de deux cases, le dessin ne change pas */
  tons.find(b => b.textContent === 'Gm').click();
  assert.equal(zone.dataset.root, 'G');
  assert.equal(zone.dataset.case, '3');
  const gm = lireManche(doc, 'tr-fb-basse', 18);
  assert.deepEqual(cases(gm), cases(am.map(n => ({ ...n, fret: n.fret - 2 }))));
  assert.deepEqual([...new Set(gm.map(n => n.note))].sort(), ['B♭', 'C', 'D', 'F', 'G'], 'B♭, pas A♯');
  assert.match(doc.getElementById('tr-info').textContent, /2 cases plus bas que Am/);
  /* les fondamentales, et elles seules, sont cerclées */
  gm.forEach(n => assert.equal(n.cercle, n.deg === '1', `corde ${n.corde} case ${n.fret}`));
  assert.deepEqual(gm.filter(n => n.cercle).map(n => n.note), ['G', 'G']);
  /* chaque pastille porte la couleur de sa note */
  const couleurs = win.NOTE_COLORS;
  for (const g of doc.querySelectorAll('#tr-fb-basse .note-g[data-box]')){
    if (g.style.display === 'none') continue;
    assert.equal(g.querySelector('circle').getAttribute('fill'), couleurs[g.dataset.note[0]]);
  }

  /* une case plus haut, une case plus bas */
  doc.getElementById('tr-plus').click();
  assert.equal(zone.dataset.root, 'G♯');
  assert.equal(zone.dataset.case, '4');
  doc.getElementById('tr-moins').click();
  doc.getElementById('tr-moins').click();
  assert.equal(zone.dataset.root, 'F♯');
  assert.equal(zone.dataset.case, '2');
});

test("l'atelier : changer de forme garde la tonalité, et les arpèges passent en majeur", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('tr-zone');
  const sel = doc.getElementById('tr-forme');
  assert.deepEqual([...sel.options].map(o => o.value),
    ['b-e1', 'b-e2', 'b-e3', 'b-a1', 'b-a2', 'b-a3', 'b-min', 'b-maj']);
  [...doc.querySelectorAll('#tr-palette .quiz-note-btn')].find(b => b.textContent === 'Cm').click();
  choisir(win, sel, 'b-a1');
  assert.equal(zone.dataset.root, 'C', 'la tonalité suit quand on change de forme');
  assert.equal(zone.dataset.case, '3');
  assert.match(doc.getElementById('tr-info').textContent, /corde de A, case 3 — 2 cases plus bas que Dm/);
  /* la forme n° 2 en Gm ne tient pas en bas du manche : une octave au-dessus */
  choisir(win, sel, 'b-e2');
  [...doc.querySelectorAll('#tr-palette .quiz-note-btn')].find(b => b.textContent === 'Gm').click();
  assert.equal(zone.dataset.case, '15');
  assert.match(doc.getElementById('tr-info').textContent, /une octave au-dessus/);
  /* l'arpège majeur : des tonalités majeures, et une tierce majeure */
  choisir(win, sel, 'b-maj');
  assert.equal(zone.dataset.root, 'G', 'tonalité du cours quand on change de couleur');
  const tons = [...doc.querySelectorAll('#tr-palette .quiz-note-btn')].map(b => b.textContent);
  assert.deepEqual(tons, ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B']);
  const g = lireManche(doc, 'tr-fb-basse', 18);
  assert.deepEqual(g.map(n => [n.corde, n.fret, n.deg, n.note]).sort(),
    [[0, 4, '3', 'B'], [1, 5, '1', 'G'], [2, 5, '5', 'D'], [3, 3, '1', 'G']]);
});

test("l'atelier passe à la guitare : les trois boîtes, sur un manche à six cordes", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('tr-zone');
  const [bBasse, bGuitare] = zone.querySelectorAll('[data-instr]');
  bGuitare.click();
  assert.equal(bGuitare.getAttribute('aria-pressed'), 'true');
  assert.equal(bBasse.getAttribute('aria-pressed'), 'false');
  assert.equal(isVisible(doc.getElementById('tr-fb-guitare')), true);
  assert.equal(isVisible(doc.getElementById('tr-fb-basse')), false);
  const sel = doc.getElementById('tr-forme');
  assert.deepEqual([...sel.options].map(o => o.value), ['g-1', 'g-4', 'g-5']);
  assert.equal(zone.dataset.forme, 'g-1');
  assert.equal(zone.dataset.root, 'A');
  assert.equal(lireManche(doc, 'tr-fb-guitare', 15).length, 12);
  /* la boîte 1 en Em tombe sur les cordes à vide */
  [...doc.querySelectorAll('#tr-palette .quiz-note-btn')].find(b => b.textContent === 'Em').click();
  assert.equal(zone.dataset.case, '0');
  assert.equal(Math.min(...lireManche(doc, 'tr-fb-guitare', 15).map(n => n.fret)), 0);
  /* la boîte 5 en F♯m : fondamentale case 14, la boîte descend jusqu'à la 11 */
  choisir(win, sel, 'g-5');
  [...doc.querySelectorAll('#tr-palette .quiz-note-btn')].find(b => b.textContent === 'F♯m').click();
  assert.equal(zone.dataset.case, '14');
  const fs = lireManche(doc, 'tr-fb-guitare', 15);
  assert.deepEqual([Math.min(...fs.map(n => n.fret)), Math.max(...fs.map(n => n.fret))], [11, 14]);
  /* retour à la basse : on retrouve ses formes */
  bBasse.click();
  assert.equal(zone.dataset.instr, 'basse');
  assert.equal(isVisible(doc.getElementById('tr-fb-basse')), true);
});

test("l'entraînement « poser la forme » : seule la bonne corde répond, la bonne case fait apparaître la forme", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('trq-zone');
  choisir(win, doc.getElementById('trq-exo'), 'poser');
  choisir(win, doc.getElementById('trq-forme'), 'b-e1');
  assert.equal(zone.dataset.exo, 'poser');
  assert.equal(zone.dataset.forme, 'b-e1');
  assert.equal(isVisible(doc.getElementById('trq-fb-basse')), true);
  assert.equal(isVisible(doc.getElementById('trq-fb-guitare')), false);
  const root = zone.dataset.root, f0 = +zone.dataset.case;
  assert.match(doc.getElementById('trq-prompt').textContent,
    new RegExp('Basse · Forme n° 1 · corde de E — pose-la en ' + root + 'm : clique la fondamentale sur la corde de E'));
  const L = 19;
  const dots = [...doc.querySelectorAll('#trq-fb-basse .note-g')];
  const at = (corde, fret) => dots[corde * L + fret];
  /* rien n'est nommé tant qu'on n'a pas trouvé */
  dots.forEach(g => assert.equal(g.querySelector('text').style.display, 'none'));
  assert.equal(dots.filter(g => g.classList.contains('cible')).length, L, 'la corde de E entière est cliquable');
  /* une autre corde : sans effet */
  clicSVG(win, at(2, f0));
  assert.equal(doc.getElementById('trq-feedback').textContent, '');
  /* une mauvaise case : on cherche encore */
  const faux = (f0 + 1) % 12;
  clicSVG(win, at(3, faux));
  assert.match(doc.getElementById('trq-feedback').textContent, new RegExp('^✗ Case ' + faux + ','));
  assert.equal(lireManche(doc, 'trq-fb-basse', 18).length, 0);
  /* la bonne : la forme apparaît, nommée, et le score compte l'essai raté */
  clicSVG(win, at(3, f0));
  assert.match(doc.getElementById('trq-feedback').textContent, new RegExp('^✓ ' + root + 'm : fondamentale sur la corde de E, case ' + f0));
  assert.equal(doc.getElementById('trq-feedback').classList.contains('juste'), false, 'trouvé au deuxième essai : pas un point');
  assert.equal(doc.getElementById('trq-score').textContent, '0 / 1');
  const forme = lireManche(doc, 'trq-fb-basse', 18);
  assert.equal(forme.length, 9);
  assert.ok(forme.some(n => n.corde === 3 && n.fret === f0 && n.deg === '1' && n.cercle));
  /* question suivante, trouvée du premier coup */
  doc.getElementById('trq-new').click();
  clicSVG(win, at(3, +zone.dataset.case));
  assert.equal(doc.getElementById('trq-score').textContent, '1 / 2');
  assert.equal(doc.getElementById('trq-feedback').classList.contains('juste'), true);
});

test("l'entraînement « nommer la tonalité » : la forme est muette, la réponse la révèle", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('trq-zone');
  choisir(win, doc.getElementById('trq-exo'), 'nommer');
  choisir(win, doc.getElementById('trq-forme'), 'g-1');
  assert.equal(zone.dataset.exo, 'nommer');
  assert.equal(isVisible(doc.getElementById('trq-fb-guitare')), true);
  assert.equal(isVisible(doc.getElementById('trq-fb-basse')), false);
  const muette = lireManche(doc, 'trq-fb-guitare', 15);
  assert.equal(muette.length, 12);
  muette.forEach(n => {
    assert.equal(n.nomVisible, false, 'le nom des notes est caché');
    assert.equal(n.note, '');
    assert.equal(n.cercle, n.deg === '1', 'seule la fondamentale est cerclée');
  });
  const tons = [...doc.querySelectorAll('#trq-palette .quiz-note-btn')];
  assert.equal(tons.length, 12);
  /* une mauvaise réponse : la bonne est montrée, la forme se nomme */
  const root = zone.dataset.root;
  const mauvais = tons.find(b => b.dataset.ton !== root);
  mauvais.click();
  assert.equal(mauvais.classList.contains('wrong'), true);
  assert.equal(tons.find(b => b.dataset.ton === root).classList.contains('correct'), true);
  assert.match(doc.getElementById('trq-feedback').textContent, new RegExp("^✗ C'était " + root + 'm'));
  assert.equal(doc.getElementById('trq-score').textContent, '0 / 1');
  lireManche(doc, 'trq-fb-guitare', 15).forEach(n => assert.equal(n.nomVisible, true));
  /* la suivante, juste */
  doc.getElementById('trq-new').click();
  [...doc.querySelectorAll('#trq-palette .quiz-note-btn')].find(b => b.dataset.ton === zone.dataset.root).click();
  assert.equal(doc.getElementById('trq-score').textContent, '1 / 2');
  assert.match(doc.getElementById('trq-feedback').textContent, /^✓ /);
});

test("l'entraînement tire ses questions dans l'instrument choisi", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('trq-zone');
  const sel = doc.getElementById('trq-forme');
  assert.deepEqual([...sel.options].slice(0, 3).map(o => o.value), ['', 'basse', 'guitare']);
  assert.equal(sel.options.length, 3 + 11);
  choisir(win, sel, 'guitare');
  for (let i = 0; i < 12; i++){
    doc.getElementById('trq-new').click();
    assert.equal(zone.dataset.instr, 'guitare');
    assert.match(zone.dataset.forme, /^g-/);
  }
  choisir(win, sel, 'basse');
  for (let i = 0; i < 12; i++){
    doc.getElementById('trq-new').click();
    assert.equal(zone.dataset.instr, 'basse');
    assert.match(zone.dataset.forme, /^b-/);
  }
});
