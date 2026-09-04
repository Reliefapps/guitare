'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, openTab } = require('./helpers');

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS = { C:'#0E9594', D:'#8E44AD', E:'#2E8B57', F:'#DE4229',
                      G:'#E67E22', A:'#2C7FB8', B:'#8D6E4B' };
const CORDES = ['G','D','A','E'];          /* de haut en bas */
const SOLFEGE = /^(do|ré|re|mi|fa|sol|la|si)$/i;

/* le contenu ajouté à partir des cours des 28 août et 4 septembre 2026 */
const NOUVEAU = ['#routine', '#pluck-avance', '#impro', '#notes-manche', '#triades'];

/* hauteur d'un nom de note écrit, altérations comprises */
function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}

/* les notes d'une tablature, relues depuis le SVG : position → corde,
   contenu → case. On recalcule la hauteur et on la compare à l'affichage. */
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
    .map(n => ({ ...n, hauteur: (CHROMA.indexOf(n.corde) + n.fret) % 12 }));
}

test('les nouveaux contenus nomment les notes en lettres, jamais en solfège', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const suspects = [];
  for (const sel of NOUVEAU){
    const racine = doc.querySelector(sel);
    assert.ok(racine, 'zone introuvable : ' + sel);
    for (const n of racine.querySelectorAll('b, strong, .mono, .prio-badge, .seq-chord, .roadmap-chain span')){
      const txt = n.textContent.trim();
      /* on ne teste que les jetons courts : c'est là que vivent les noms de notes */
      if (txt.length <= 4 && SOLFEGE.test(txt)) suspects.push(sel + ' → « ' + txt + ' »');
    }
  }
  assert.deepEqual(suspects, []);
});

test('les noms de cordes et de notes des SVG basse sont des lettres', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svgs = [...doc.querySelectorAll('#pluck-list svg'), ...doc.querySelectorAll('#forme-list svg'),
                doc.getElementById('fretboard-basse')];
  const suspects = [];
  for (const svg of svgs){
    for (const t of svg.querySelectorAll('text')){
      const txt = t.textContent.trim();
      if (txt.length <= 4 && SOLFEGE.test(txt)) suspects.push(txt);
    }
  }
  assert.deepEqual(suspects, []);
});

test('chaque note des tablatures est colorée selon la note réellement jouée', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svgs = [...doc.querySelectorAll('#pluck-list .tab-scroll svg')];
  assert.ok(svgs.length > 0);
  for (const svg of svgs){
    for (const n of lireTablature(svg)){
      const lettre = Object.keys(NOTE_COLORS).find(L => NOTE_COLORS[L] === n.fill);
      assert.ok(lettre, `corde ${n.corde} case ${n.fret} : couleur inconnue ${n.fill}`);
      /* la lettre affichée doit désigner la note jouée, à une altération près
         (B♭ et A♯ sont la même note, écrites différemment) */
      const ecart = Math.min(...[0, 1, 11].map(d => (hauteur(lettre) + d) % 12 === n.hauteur ? 0 : 1));
      assert.equal(ecart, 0,
        `corde ${n.corde} case ${n.fret} = ${CHROMA[n.hauteur]} : colorée comme un ${lettre}`);
    }
  }
});

test('chaque note est jouée deux fois dans les exercices 1 et 2', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const svg of doc.querySelectorAll('#px-p1 .tab-scroll svg, #px-p2 .tab-scroll svg')){
    const notes = lireTablature(svg);
    assert.equal(notes.length % 12, 0, 'mesures à 12 croches attendues');
    for (let i = 0; i < notes.length; i += 2){
      assert.equal(notes[i].corde, notes[i+1].corde, 'la répétition change de corde');
      assert.equal(notes[i].fret, notes[i+1].fret, 'la répétition change de case');
    }
  }
});

test('les légendes de notes correspondent aux tablatures', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const bloc of doc.querySelectorAll('#px-p1, #px-p2, #px-p3, #px-p4')){
    const svgs = [...bloc.querySelectorAll('.tab-scroll svg')];
    const double = bloc.id === 'px-p1' || bloc.id === 'px-p2';
    svgs.forEach(svg => {
      /* la légende suit immédiatement sa ligne de tablature */
      const legende = svg.closest('.tab-scroll').nextElementSibling;
      assert.ok(legende && legende.classList.contains('tab-note'),
        bloc.id + ' : légende manquante');
      const affichees = [...legende.querySelectorAll('b')].map(b => hauteur(b.textContent.trim()));
      const jouees = lireTablature(svg)
        .filter((_, i) => !double || i % 2 === 0)   /* dans 1 et 2, chaque note est écrite deux fois */
        .map(n => n.hauteur);
      assert.deepEqual(affichees, jouees, bloc.id + ' : légende et tablature divergent');
    });
  }
});

test('exercice #3 : la quarte puis la quinte sur chaque paire de cordes', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const notes = lireTablature(doc.querySelector('#px-p3 .tab-scroll svg'));
  assert.equal(notes.length, 16, 'deux mesures de huit croches');
  for (let g = 0; g < notes.length; g += 4){
    const [a, b, c, d] = notes.slice(g, g + 4);
    assert.equal(a.hauteur, c.hauteur, 'la fondamentale revient en 3ᵉ position');
    assert.equal((b.hauteur - a.hauteur + 12) % 12, 5, 'quarte juste attendue');
    assert.equal((d.hauteur - a.hauteur + 12) % 12, 7, 'quinte juste attendue');
    assert.equal(a.corde, c.corde);
    assert.notEqual(a.corde, b.corde, 'la paire doit changer de corde');
    assert.equal(b.corde, d.corde);
  }
});

test("exercice #4 : on saute une corde, et la 2ᵉ mesure est deux cases plus bas", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const notes = lireTablature(doc.querySelector('#px-p4 .tab-scroll svg'));
  assert.equal(notes.length, 16, 'deux mesures de huit croches');
  const rang = { G: 0, D: 1, A: 2, E: 3 };
  for (let i = 0; i < notes.length; i += 2){
    assert.equal(Math.abs(rang[notes[i].corde] - rang[notes[i+1].corde]), 2,
      'chaque paire doit sauter une corde');
  }
  /* mesure 2 = mesure 1, deux cases plus bas, sur les mêmes cordes */
  for (let i = 0; i < 8; i++){
    assert.equal(notes[8+i].corde, notes[i].corde);
    assert.equal(notes[8+i].fret, notes[i].fret - 2);
  }
});

test("les formes d'arpège sonnent la fondamentale, la quinte, l'octave et la tierce", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  /* demi-tons entre la corde de E grave et chaque corde à vide */
  const CORDE = { E: 0, A: 5, D: 10, G: 15 };
  /* les intervalles attendus, en demi-tons depuis la fondamentale */
  const ATTENDU = { 'fo-min': [0, 7, 12, 15], 'fo-maj': [0, 7, 12, 16] };
  for (const id of Object.keys(ATTENDU)){
    const notes = [...doc.querySelectorAll('#' + id + ' .forme-note')].map(g => ({
      note: g.dataset.note, degre: g.dataset.degre, corde: g.dataset.corde,
      fret: Number(g.dataset.case),
      demi: CORDE[g.dataset.corde] + Number(g.dataset.case),
    }));
    assert.equal(notes.length, 4, id + ' : quatre notes attendues');
    /* le nom affiché est bien la note que la case donne */
    for (const n of notes){
      assert.equal((CHROMA.indexOf(n.corde) + n.fret) % 12, hauteur(n.note),
        `${id} : ${n.note} ne correspond pas à la case jouée`);
    }
    assert.deepEqual(notes.map(n => n.demi - notes[0].demi), ATTENDU[id],
      id + ' : les intervalles ne sont pas ceux de l\'arpège');
    /* les degrés annoncés collent aux intervalles */
    assert.deepEqual(notes.map(n => n.degre),
      id === 'fo-min' ? ['1', '5', '8', '♭3'] : ['1', '5', '8', '3']);
  }
});
