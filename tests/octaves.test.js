'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* la section « Trois octaves, trois paires de cordes » de la fiche théorie —
   cours de guitare du 16 novembre 2026 : un motif sur E–A se rejoue sur D–G
   deux cases plus haut, puis sur B–E trois cases plus haut, une octave à
   chaque fois. */

const NATUREL = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 };
function classe(nom){
  let h = NATUREL[nom[0]];
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}
/* hauteur absolue des cordes à vide (MIDI), corde 0 = E aigu … 5 = E grave */
const VIDE = [64, 59, 55, 50, 45, 40];
const hauteurDe = (corde, fret) => VIDE[corde] + fret;
const clicSVG = (win, el) => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const oc = win => win.theorie.octaves;
const FRETS = 19;

/* les pastilles visibles d'un manche, relues depuis le SVG */
function lireManche(doc, svgId){
  const L = FRETS + 1;
  return [...doc.querySelectorAll('#' + svgId + ' .note-g')]
    .map((g, k) => ({ g, corde: Math.floor(k / L), fret: k % L }))
    .filter(n => n.g.style.display !== 'none' && n.g.dataset.box)
    .map(n => ({ corde: n.corde, fret: n.fret, note: n.g.dataset.note, deg: n.g.dataset.deg,
      paire: n.g.dataset.paire, cercle: n.g.querySelector('circle').getAttribute('stroke') !== 'none' }));
}
function lireTab(doc){
  return [...doc.querySelectorAll('#oc-tab .oc-tab-note')].map(t => ({
    corde: +t.dataset.corde, fret: +t.dataset.case, note: t.dataset.note, paire: t.dataset.paire,
    texte: t.textContent, x: +t.getAttribute('x') })).sort((a, b) => a.x - b.x);
}
function choisir(win, select, valeur){
  select.value = valeur;
  select.dispatchEvent(new win.Event('change', { bubbles: true }));
}

test('la section Trois octaves est dans la théorie, rendue et visible, avec la date et la règle du cours', () => {
  const { doc, jsErrors } = load();
  const sec = doc.getElementById('octaves');
  assert.ok(sec, 'section absente');
  assert.equal(sec.closest('.page').id, 'page-theorie');
  assert.equal(isVisible(sec), false, 'visible avant d\'ouvrir l\'onglet');
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '8');
  assert.match(sec.querySelector('.hint').textContent, /16 novembre 2026/);
  const regle = sec.querySelector('.rule').textContent;
  assert.match(regle, /E–A.*D–G.*\+2 cases/);
  assert.match(regle, /D–G.*B–E.*\+3 cases/);
  for (const id of ['oc-zone', 'oc-fb', 'oc-tab', 'ocq-zone', 'ocq-fb', 'oc-exos']){
    assert.equal(isVisible(doc.getElementById(id)), true, id + ' rendu mais pas visible');
  }
  assert.equal(doc.querySelectorAll('#oc-exos .exo-steps li').length, 6);
  assert.ok(doc.querySelector('#oc-tab svg'), 'pas de tablature');
  assert.deepEqual(jsErrors, []);
});

test('les décalages sont ceux du cours : +2 de E–A à D–G, +3 de D–G à B–E', () => {
  const { win } = load();
  const P = oc(win).PAIRES;
  assert.deepEqual([...P].map(p => p.id), ['EA', 'DG', 'BE']);
  assert.equal(P[1].decalage - P[0].decalage, 2);
  assert.equal(P[2].decalage - P[1].decalage, 3);
  /* « tu retrouves l'A » : case 5, puis 7, puis 10 */
  assert.deepEqual([...P].map(p => oc(win).caseSur('A', p)), [5, 7, 10]);
});

test('pour chaque motif et chaque tonalité, chaque paire rejoue la précédente une octave plus haut', () => {
  const { win } = load();
  const racines = ['A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'E♭', 'D', 'G', 'C', 'F', 'B♭'];
  for (const motif of oc(win).MOTIFS){
    for (const root of racines){
      const notes = [...oc(win).jouer(motif, root)];
      const parPaire = ['EA', 'DG', 'BE'].map(id => notes.filter(n => n.paire === id));
      for (const groupe of parPaire){
        assert.equal(groupe.length, motif.notes.length);
        for (const n of groupe){
          assert.ok(n.fret >= 0 && n.fret <= FRETS, `${motif.id} ${root} : case ${n.fret} hors du manche`);
          assert.equal(classe(n.nom), hauteurDe(n.corde, n.fret) % 12, `${motif.id} ${root} : ${n.nom} mal nommé`);
        }
      }
      for (let i = 1; i < 3; i++){
        parPaire[i].forEach((n, j) => {
          const avant = parPaire[i - 1][j];
          assert.equal(hauteurDe(n.corde, n.fret) - hauteurDe(avant.corde, avant.fret), 12,
            `${motif.id} ${root} : la note ${j + 1} n'est pas à l'octave`);
          assert.equal(n.nom, avant.nom);
        });
      }
    }
  }
});

test('les motifs sortent des cours : fondamentale, quinte, et la boîte 1 sur ses deux cordes graves', () => {
  const { win } = load();
  const M = oc(win).MOTIFS;
  assert.deepEqual([...M].map(m => m.id), ['fond', 'quinte', 'monte', 'descend', 'aller']);
  const notesEnA = id => [...oc(win).jouer(M.find(m => m.id === id), 'A', [oc(win).PAIRES[0]])];
  assert.deepEqual(notesEnA('fond').map(n => n.nom), ['A']);
  assert.deepEqual(notesEnA('quinte').map(n => n.nom), ['A', 'E']);
  assert.deepEqual(notesEnA('monte').map(n => n.nom), ['A', 'C', 'D', 'E']);
  assert.deepEqual(notesEnA('descend').map(n => n.nom), ['E', 'D', 'C', 'A']);
  assert.deepEqual(notesEnA('aller').map(n => n.nom), ['A', 'C', 'D', 'E', 'D', 'C', 'A']);
  /* la boîte 1 de la fiche : cordes E grave 5 / 8 et A 5 / 7 */
  assert.deepEqual(notesEnA('monte').map(n => n.corde + ':' + n.fret), ['5:5', '5:8', '4:5', '4:7']);
  const boite1 = [...win.theorie.transposer.FORMES].find(f => f.id === 'g-1');
  const graves = [...boite1.notes].filter(n => n[0] >= 4).map(n => n[0] + ':' + (5 + n[1]));
  assert.deepEqual(notesEnA('monte').map(n => n.corde + ':' + n.fret).sort(), graves.sort());
});

test("l'atelier : manche et tablature disent la même chose, et suivent le motif et la tonalité", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('oc-zone');
  assert.equal(zone.dataset.motif, 'monte');
  assert.equal(zone.dataset.root, 'A');
  const verifier = (motifId, root) => {
    const manche = lireManche(doc, 'oc-fb');
    const tab = lireTab(doc);
    const motif = [...oc(win).MOTIFS].find(m => m.id === motifId);
    assert.equal(tab.length, motif.notes.length * 3, motifId + ' : tablature incomplète');
    /* la tablature se lit de gauche à droite dans l'ordre du jeu */
    assert.deepEqual(tab.map(n => n.paire + ':' + n.corde + ':' + n.fret),
      [...oc(win).jouer(motif, root)].map(n => n.paire + ':' + n.corde + ':' + n.fret));
    for (const n of tab){
      assert.equal(n.texte, String(n.fret));
      assert.equal(classe(n.note), hauteurDe(n.corde, n.fret) % 12);
      assert.ok(manche.some(p => p.corde === n.corde && p.fret === n.fret && p.note === n.note),
        `${motifId} ${root} : ${n.corde}:${n.fret} dans la tablature mais pas sur le manche`);
    }
    for (const p of manche){
      assert.equal(classe(p.note), hauteurDe(p.corde, p.fret) % 12);
      assert.equal(p.cercle, p.deg === '1', `${p.corde}:${p.fret} : seule la fondamentale est cerclée`);
    }
    assert.equal(new Set(manche.map(p => p.paire)).size, 3);
  };
  verifier('monte', 'A');
  assert.match(doc.getElementById('oc-info').textContent, /E–A : case 5.*D–G : case 7 \(\+2\).*B–E : case 10 \(\+3\)/);
  const tons = [...doc.querySelectorAll('#oc-palette button')];
  assert.equal(tons.length, 12);
  tons.find(b => b.dataset.ton === 'G').click();
  assert.equal(zone.dataset.root, 'G');
  verifier('monte', 'G');
  assert.match(doc.getElementById('oc-info').textContent, /E–A : case 3.*D–G : case 5.*B–E : case 8/);
  for (const id of ['fond', 'quinte', 'descend', 'aller']){
    choisir(win, doc.getElementById('oc-motif'), id);
    assert.equal(zone.dataset.motif, id);
    verifier(id, 'G');
  }
  /* la tonalité la plus haute tient encore sur le manche */
  [...doc.querySelectorAll('#oc-palette button')].find(b => b.dataset.ton === 'E♭').click();
  verifier('aller', 'E♭');
});

test("l'entraînement : cliquer la case où le motif recommence, sur la corde grave de la paire visée", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('ocq-zone');
  const fb = doc.getElementById('ocq-feedback');
  const L = FRETS + 1;
  const pastille = (corde, fret) => doc.querySelectorAll('#ocq-fb .note-g')[corde * L + fret];

  /* E–A → D–G en A : le motif est posé case 5, il recommence case 7 de la corde de D */
  oc(win).question({ source:'EA', cible:'DG', motif:'monte', root:'A' });
  assert.equal(zone.dataset.attendu, '7');
  const pose = lireManche(doc, 'ocq-fb');
  assert.deepEqual(pose.map(p => p.corde + ':' + p.fret).sort(), ['4:5', '4:7', '5:5', '5:8']);
  assert.ok(pastille(3, 7).classList.contains('cible'));
  assert.ok(!pastille(2, 7).classList.contains('cible'), 'seule la corde grave de la paire répond');
  /* la case de la règle oubliée (+3 au lieu de +2) est refusée */
  clicSVG(win, pastille(3, 8));
  assert.match(fb.textContent, /✗/);
  /* la bonne note à l'octave du dessus est refusée aussi, avec l'explication */
  clicSVG(win, pastille(3, 19));
  assert.match(fb.textContent, /pas la bonne octave/);
  clicSVG(win, pastille(3, 7));
  assert.match(fb.textContent, /✓ Case 7 : \+2 cases/);
  assert.equal(doc.getElementById('ocq-score').textContent, '0 / 1');
  assert.equal(lireManche(doc, 'ocq-fb').filter(p => p.paire === 'DG').length, 4);

  /* D–G → B–E en A, du premier coup : +3, case 10 */
  oc(win).question({ source:'DG', cible:'BE', motif:'quinte', root:'A' });
  assert.equal(zone.dataset.attendu, '10');
  clicSVG(win, pastille(1, 10));
  assert.match(fb.textContent, /✓ Case 10 : \+3 cases/);
  assert.equal(doc.getElementById('ocq-score').textContent, '1 / 2');

  /* dans l'autre sens, B–E → E–A en G : −5, case 3, deux octaves plus bas */
  oc(win).question({ source:'BE', cible:'EA', motif:'monte', root:'G' });
  assert.equal(zone.dataset.attendu, '3');
  clicSVG(win, pastille(5, 3));
  assert.match(fb.textContent, /−5 cases.*deux octaves plus bas/);

  /* les questions tirées au hasard restent toujours sur le manche */
  for (let i = 0; i < 60; i++){
    doc.getElementById('ocq-new').click();
    const a = +zone.dataset.attendu;
    assert.ok(a >= 0 && a <= FRETS);
    assert.notEqual(zone.dataset.source, zone.dataset.cible);
    assert.ok(pastille([...oc(win).PAIRES].find(p => p.id === zone.dataset.cible).grave, a).classList.contains('cible'));
  }
  assert.deepEqual(jsErrors, []);
});
