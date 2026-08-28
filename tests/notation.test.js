'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, openTab } = require('./helpers');

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS = { C:'#0E9594', D:'#8E44AD', E:'#2E8B57', F:'#DE4229',
                      G:'#E67E22', A:'#2C7FB8', B:'#8D6E4B' };
const CORDES = ['G','D','A','E'];          /* de haut en bas */
const SOLFEGE = /^(do|ré|re|mi|fa|sol|la|si)$/i;

/* le contenu ajouté le 28 août 2026 — c'est lui qui doit rester en lettres */
const NOUVEAU = ['#routine', '#main-attaque', '#pluck-avance', '#notes-manche',
                 '#croches .status-table', '#croches .warn', '#page-basse .roadmap'];

/* les notes d'une tablature, relues depuis le SVG : position → corde,
   contenu → case. On recalcule la note et on la compare à l'affichage. */
function lireTablature(svg){
  const notes = [...svg.querySelectorAll('text')]
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
    .sort((a, b) => a.x - b.x);
  return notes.map(n => ({
    ...n,
    attendue: CHROMA[(CHROMA.indexOf(n.corde) + n.fret) % 12],
  }));
}

test('les nouveaux contenus nomment les notes en lettres, jamais en solfège', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const suspects = [];
  for (const sel of NOUVEAU){
    const racine = doc.querySelector(sel);
    assert.ok(racine, 'zone introuvable : ' + sel);
    for (const n of racine.querySelectorAll('b, strong, .mono, .prio-badge, .roadmap-chain span')){
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
  const svgs = [...doc.querySelectorAll('#pluck-list svg'), doc.getElementById('fretboard-basse')];
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
      const lettre = n.attendue[0];
      assert.equal(n.fill, NOTE_COLORS[lettre],
        `corde ${n.corde} case ${n.fret} = ${n.attendue} : couleur ${n.fill} au lieu de ${NOTE_COLORS[lettre]}`);
    }
  }
});

test('chaque note est jouée deux fois dans les exercices 1 et 2', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const svg of doc.querySelectorAll('#pluck-list .tab-scroll svg')){
    const notes = lireTablature(svg);
    /* 12 croches par mesure */
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
  for (const bloc of doc.querySelectorAll('#px-p1, #px-p2')){
    const svgs = [...bloc.querySelectorAll('.tab-scroll svg')];
    svgs.forEach(svg => {
      /* la légende suit immédiatement sa ligne de tablature */
      const legende = svg.closest('.tab-scroll').nextElementSibling;
      assert.ok(legende && legende.classList.contains('tab-note'), 'légende manquante');
      const affichees = [...legende.querySelectorAll('b')]
        .map(b => b.textContent.trim().replace('♯', '#'));
      const jouees = lireTablature(svg)
        .filter((_, i) => i % 2 === 0)      /* chaque note est écrite deux fois */
        .map(n => n.attendue);
      assert.deepEqual(affichees, jouees);
    });
  }
});

test('les cordes annoncées pour le pouce sont bien E, A, D et G', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const txt = doc.querySelector('#main-attaque').textContent;
  assert.match(txt, /cordes\s+E\s+et\s+A/);
  assert.match(txt, /pour jouer\s+D\s+et\s+G/);
});
