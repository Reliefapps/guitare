'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, isVisible, openTab } = require('./helpers');

/* le cours du 6 novembre 2026 : le chapitre I de la méthode de Santiago, The
   Role of the Bass in Music, ses cinq exercices et les notes de passage */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS = { C:'#0E9594', D:'#8E44AD', E:'#2E8B57', F:'#DE4229',
                      G:'#E67E22', A:'#2C7FB8', B:'#8D6E4B' };

function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '♯') h += 1;
    if (c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}
function casesDe(svg){
  return [...svg.querySelectorAll('text.case')].sort((a, b) => a.getAttribute('x') - b.getAttribute('x'));
}
/* les notes telles que la feuille les écrit : corde + case + durée en croches,
   « ~ » pour une note liée */
function lire(svg){
  return casesDe(svg).map(t => t.dataset.corde + t.textContent +
    (t.dataset.croches === '1' ? '' : '*' + t.dataset.croches) + (t.dataset.liee === '1' ? '~' : ''));
}
const accords = svg => [...svg.querySelectorAll('text')]
  .filter(t => t.getAttribute('y') === '16').map(t => t.textContent);

/* la feuille Basic Exercises, relue case par case sur le PDF */
const FEUILLE = {
  '1': { tempo:96, armure:['♯'], accords:['G','Em','C','D'], notes:[
    'E3*2','E3','E3*2', 'E0*2','E0','E0*2', 'A3*2','A3','A3*2', 'A5*2','A5','A5*2'] },
  '2': { tempo:75, armure:['♯'], accords:['Am','C','Bm','D','E'], notes:[
    'E5*2','E5','E5*2', 'E8*2','E8','E8*2', 'E7*2','E7','E7*2', 'A5*2','A0','A7*2'] },
  '3': { tempo:110, armure:['♯'], accords:['Em','Am','G','B'], notes:[
    'E0*4','E0','E0','E0*2~', 'E5*4','E5','E5','E5*2~',
    'E3*4','E3','E3','E3*2~', 'A2*4','A2','A2','A2*2~'] },
  '4': { tempo:90, armure:['♯','♯'], accords:['Bm','D','F♯m','E'], notes:[
    'A2*2','A2','A2','A2','A2~','A2', 'A5*2','A5','A5','A5','A5~','A5',
    'D4*2','D4','D4','D4','D4~','D4', 'D2*2','D2','D2','D2','D2~','D2'] },
  '5': { tempo:100, armure:['♭'], accords:['F','Gm','B♭','C','F','Gm','B♭','C'], notes:[
    'E1','E1','E1','E3','E3', 'A1','A1','A1','A3','A3',
    'E1','E1','E1','E3','E3', 'A1','A1','A1','A3','A3'] },
};
const PISTES = {
  '1':'FqXbtpsHWdg', '2':'w9K8tJjq1-c', '3':'RNT2wYxGe20', '4':'hT7p56MRRNc', '5':'TB_UVcWfw-8' };

test('les deux sections du cours sont visibles et citent leur date', () => {
  const { doc, jsErrors } = load();
  assert.deepEqual(jsErrors.map(e => e.message), []);
  for (const id of ['role-basse', 'accompagner']) assert.equal(isVisible(doc.getElementById(id)), false);
  openTab(doc, 'basse');
  for (const id of ['role-basse', 'accompagner']){
    const sec = doc.getElementById(id);
    assert.equal(isVisible(sec), true);
    assert.match(sec.querySelector('.hint').textContent, /6 novembre 2026/);
  }
  assert.equal(isVisible(doc.getElementById('connexions')), true);
});

test('le sommaire collant et le sommaire latéral mènent aux nouvelles sections', () => {
  const { doc } = load();
  const collant = [...doc.querySelectorAll('#page-basse nav.sticky a')].map(a => a.getAttribute('href'));
  const lateral = [...doc.querySelectorAll('#sidenav-links-basse a')].map(a => a.getAttribute('href'));
  for (const h of ['#role-basse', '#accompagner']){
    assert.ok(collant.includes(h), h);
    assert.ok(lateral.includes(h), h);
  }
  for (const h of ['#ac-1', '#ac-5', '#connexions']) assert.ok(lateral.includes(h), h);
  lateral.forEach(h => assert.ok(doc.querySelector(h), h + ' ne mène nulle part'));
});

test('la méthode suit les étapes du cours et de la feuille', () => {
  const { doc } = load();
  const etapes = [...doc.querySelectorAll('#accompagner .steps li')].map(li => li.textContent);
  assert.equal(etapes.length, 6);
  assert.match(etapes[0], /accords/);
  assert.match(etapes[1], /durée/);
  assert.match(etapes[2], /plus graves/);
  assert.match(etapes[3], /grosse caisse/);
  assert.match(etapes[4], /rythme/);
  assert.match(etapes[5], /notes de passage/);
});

for (const [id, f] of Object.entries(FEUILLE)){
  test(`l'exercice ${id} reproduit la feuille`, () => {
    const { doc } = load();
    openTab(doc, 'basse');
    const carte = doc.getElementById('ac-' + id);
    assert.equal(isVisible(carte), true);
    const svg = carte.querySelector('svg');
    assert.deepEqual([...lire(svg)], f.notes);
    assert.deepEqual([...accords(svg)], f.accords);
    assert.equal(carte.querySelector('.rythme-tempo').value, String(f.tempo));
    assert.deepEqual([...svg.querySelectorAll('.armure')].map(a => a.textContent), f.armure);
    /* aucune altération en plus : l'armure suffit */
    assert.equal(svg.querySelectorAll('.alteration').length, 0);
    /* les têtes et les chiffres portent la couleur de la note */
    for (const t of casesDe(svg)){
      const h = (CHROMA.indexOf(t.dataset.corde) + +t.dataset.case) % 12;
      assert.ok(Object.keys(NOTE_COLORS).some(n => t.getAttribute('fill') === NOTE_COLORS[n] &&
        (hauteur(n) === h || hauteur(n) === (h + 1) % 12 || hauteur(n) === (h + 11) % 12)));
    }
    /* chaque mesure fait quatre temps, silences compris */
    const compte = [...svg.querySelectorAll('.silence')].reduce((s, g) => s + +g.dataset.croches, 0)
      + casesDe(svg).reduce((s, t) => s + +t.dataset.croches, 0);
    assert.equal(compte, 32);
    /* un silence s'écrit aussi sur la tablature */
    assert.equal(svg.querySelectorAll('.silence-tab').length, svg.querySelectorAll('.silence').length);
    /* la piste de la playlist, dans la fenêtre dédiée */
    const lien = carte.querySelector('.play-link');
    assert.ok(lien.href.includes('v=' + PISTES[id]));
    assert.ok(lien.href.includes('list=PLKcaQFXWRRFk'));
    assert.equal(lien.target, '_blank');
  });
}

test('le pattern des exercices 1 et 2 laisse le deuxième temps à la caisse claire', () => {
  const { doc } = load();
  for (const id of ['1', '2']){
    const svg = doc.querySelector(`#ac-${id} svg`);
    /* une noire, un demi-soupir, une croche, une noire, un soupir */
    const sil = [...svg.querySelectorAll('.silence')].map(g => g.dataset.croches);
    assert.deepEqual(sil, ['1','2','1','2','1','2','1','2']);
  }
});

test('la blanche a sa tête creuse, les croches sont coupées par le silence', () => {
  const { doc } = load();
  assert.equal(doc.querySelectorAll('#ac-3 svg .tete.blanche').length, 4);
  assert.equal(doc.querySelectorAll('#ac-1 svg .tete.blanche').length, 0);
  /* exercice 5 : (F F) silence (F) (G G) → deux ligatures et un crochet par mesure */
  const svg = doc.querySelector('#ac-5 svg');
  assert.equal(svg.querySelectorAll('.ligature').length, 8);
  assert.equal(svg.querySelectorAll('.crochet').length, 4);
});

test('la batterie du cours est dans le dépôt et se lance depuis l\'exercice 1', () => {
  const { doc } = load();
  const audio = doc.querySelector('#ac-1 audio');
  assert.ok(audio);
  assert.equal(audio.getAttribute('src'), 'basse/batterie-96.mp3');
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'basse', 'batterie-96.mp3')));
  assert.equal(doc.querySelectorAll('#accomp-list audio').length, 1);
});

test('le tableau des notes de passage reprend la photo de Santiago', () => {
  const { doc } = load();
  assert.equal(doc.getElementById('connexions-gamme').textContent, 'G · A · B · C · D · E · F♯');
  const lignes = [...doc.querySelectorAll('#connexions-corps tr')].map(tr => ({
    passage: tr.cells[0].textContent,
    voisines: tr.cells[1].textContent,
    cible: tr.querySelector('.cible').textContent,
  }));
  assert.deepEqual(lignes.map(l => [l.passage, l.voisines, l.cible]), [
    ['G → Em', 'D E F♯', 'E'],
    ['Em → C', 'B C D', 'C'],
    ['C → D',  'C D E', 'D'],
    ['D → G',  'F♯ G A', 'G'],
  ].map(x => [...x]));
});

test('les deux chemins gardent le pattern et finissent sur une voisine de l\'accord suivant', () => {
  const { doc } = load();
  const CHEMINS = {
    grave:[['E3','E2'], ['E0','A2'], ['A3','A3'], ['A5','E2']],
    haut: [['A10','A5'], ['A7','A5'], ['A3','A7'], ['A5','A9']],
  };
  const SUIVANT = ['E', 'C', 'D', 'G'];        /* l'accord d'après */
  for (const [id, mesures] of Object.entries(CHEMINS)){
    const carte = doc.getElementById('ch-' + id);
    assert.equal(isVisible(carte), false);
    const notes = lire(carte.querySelector('svg'));
    assert.equal(notes.length, 16);
    mesures.forEach(([racine, passage], m) => {
      assert.deepEqual([...notes.slice(m * 4, m * 4 + 4)],
        [racine + '*2', racine, racine + '*2', passage + '*2']);
      const corde = passage[0], cas = +passage.slice(1);
      const h = (CHROMA.indexOf(corde) + cas) % 12;
      const gamme = ['G','A','B','C','D','E','F#'].map(n => CHROMA.indexOf(n));
      const i = gamme.indexOf(h);
      assert.ok(i >= 0, passage + ' sort de la gamme de G');
      const voisines = [gamme[(i + 6) % 7], gamme[(i + 1) % 7]];
      assert.ok(voisines.includes(CHROMA.indexOf(SUIVANT[m])), passage + ' ne touche pas ' + SUIVANT[m]);
    });
  }
});

test('écouter le rythme saute les silences et garde la durée de la mesure', () => {
  const { doc, win } = load();
  openTab(doc, 'basse');
  const crees = [];
  class Faux {
    constructor(){ this.currentTime = 0; this.destination = {}; }
    resume(){} close(){}
    createGain(){ return { gain:{ value:0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){}, disconnect(){} }; }
    createOscillator(){
      const o = { frequency:{ value:0 }, connect(){}, start(t){ o.t = t; }, stop(){}, type:'' };
      crees.push(o);
      return o;
    }
  }
  win.AudioContext = Faux;
  const bouton = doc.querySelector('#ac-1 .rythme-play');
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'true');
  /* 12 notes (deux oscillateurs chacune), 16 clics sur quatre mesures, 4 de décompte */
  assert.equal(crees.filter(o => o.type === 'triangle').length, 12);
  assert.equal(crees.filter(o => o.type === 'square').length, 20);
  const t = crees.filter(o => o.type === 'triangle').map(o => o.t);
  const croche = 30 / 96;
  const reel = (t[1] - t[0]) / croche;
  assert.ok(Math.abs(reel - 3) < 1e-6, 'le « et » du 2 doit tomber trois croches après le 1');
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'false');
});

test('les arpèges restent sans silence : rien ne change pour eux', () => {
  const { doc } = load();
  assert.equal(doc.querySelectorAll('#renversements-list .silence').length, 0);
});
