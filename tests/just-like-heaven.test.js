'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* L'intro de Just Like Heaven (The Cure), sur la fiche guitare : les quatre
   accords, la rythmique sur huit croches, le lecteur et le riff du prof. */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_COLORS = { C:'#0E9594', D:'#8E44AD', E:'#2E8B57', F:'#DE4229',
                      G:'#E67E22', A:'#2C7FB8', B:'#8D6E4B' };
const ACCORDS = [
  { id:'A',   voicing:'x02220', midi:[45,52,57,61,64] },
  { id:'E',   voicing:'022100', midi:[40,47,52,56,59,64] },
  { id:'Bm7', voicing:'x20202', midi:[47,50,57,59,66] },
  { id:'D',   voicing:'xx0232', midi:[50,57,62,66] },
];
/* la feuille du prof : [corde, case] colonne par colonne, mesure par mesure */
const RIFF = [
  [['e',0],['B',14], ['e',0],['B',14], ['e',0],['B',14], ['e',0],['B',12], ['e',0],['B',12], ['e',0],['B',10], ['e',0],['B',10]],
  [['e',0],['B',9], ['e',0],['B',9], ['e',0],['B',9], ['e',0],['B',7], ['e',0],['B',7], ['e',0],['B',5], ['e',0],['B',5]],
  [['e',0],['B',3], ['e',0],['B',3], ['e',0],['B',3], ['e',0],['B',2], ['e',0],['B',3]],
  [['e',0],['B',0],['G',4], ['e',0],['B',0],['G',2]],
];
const OUVERTE = { e:'E', B:'B', G:'G' };

function ouvrir(){
  const r = load();
  openTab(r.doc, 'guitare');
  return r;
}

test('la section 8 est rendue et visible, le sommaire collant, le menu latéral et le scrollspy la connaissent', () => {
  const { doc, observers, jsErrors } = ouvrir();
  const sec = doc.getElementById('jlh');
  assert.equal(isVisible(sec), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '8');
  assert.match(sec.querySelector('h2').textContent, /Just Like Heaven/);
  assert.equal(doc.querySelector('#page-guitare nav.sticky a[href="#jlh"]').textContent, '8 · Just Like Heaven');
  const lateral = doc.querySelector('#sidenav-links a.lvl1[href="#jlh"]');
  assert.equal(lateral.textContent, '8 · Just Like Heaven');
  /* les trois sous-parties, dans l'ordre, et chacune mène quelque part de visible */
  const sous = [...doc.querySelectorAll('#sidenav-links a.lvl2')].filter(a => a.getAttribute('href').startsWith('#jlh-'));
  assert.deepEqual(sous.map(a => a.getAttribute('href')), ['#jlh-accords', '#jlh-rythme', '#jlh-riff']);
  sous.forEach(a => assert.equal(isVisible(doc.getElementById(a.getAttribute('href').slice(1))), true, a.getAttribute('href')));
  const spy = observers.find(o => o.targets.some(t => t.id === 'manche'));
  assert.ok(spy.targets.some(t => t.id === 'jlh'), 'le scrollspy ignore la section 8');
  spy.enter(sec);
  const actifs = [...doc.querySelectorAll('#sidenav-links a.active')];
  assert.equal(actifs.length, 1);
  assert.equal(actifs[0].getAttribute('href'), '#jlh');
  assert.deepEqual(jsErrors, []);
});

test('les quatre accords de l\'intro, A E Bm7 D, avec leurs diagrammes fidèles aux voicings', () => {
  const { doc } = ouvrir();
  const cartes = [...doc.querySelectorAll('#jlh-chords .chord-card')];
  assert.deepEqual(cartes.map(c => c.querySelector('.chord-name').textContent), ACCORDS.map(a => a.id));
  assert.deepEqual(cartes.map(c => c.querySelector('.chord-fr').textContent), ACCORDS.map(a => a.voicing));
  cartes.forEach((carte, i) => {
    assert.equal(carte.id, 'jlh-' + ACCORDS[i].id);
    assert.equal(isVisible(carte), true);
    const svg = carte.querySelector('svg');
    const v = ACCORDS[i].voicing;
    /* le × au-dessus du sillet (taille 15) ; sous le diagramme, la note vaut aussi × */
    const croix = [...svg.querySelectorAll('text')].filter(t => t.textContent === '×' && t.getAttribute('font-size') === '15').length;
    const vides = [...svg.querySelectorAll('circle')].filter(c => c.getAttribute('fill') === 'none').length;
    const doigts = [...svg.querySelectorAll('circle')].filter(c => +c.getAttribute('r') === 11).length;
    assert.equal(croix, (v.match(/x/g) || []).length, 'cordes non jouées de ' + v);
    assert.equal(vides, (v.match(/0/g) || []).length, 'cordes à vide de ' + v);
    assert.equal(doigts, (v.match(/[1-9]/g) || []).length, 'cordes frettées de ' + v);
  });
  /* Bm7 : le doigté n'est pas noté, les pastilles sont vides ; les autres sont numérotées */
  const numeros = svg => [...svg.querySelectorAll('text')].filter(t => /^[1-4]$/.test(t.textContent)).length;
  assert.equal(numeros(cartes[2].querySelector('svg')), 0);
  assert.equal(numeros(cartes[0].querySelector('svg')), 3);
  assert.match(doc.querySelector('#jlh-accords .prog-legend').textContent, /x20202/);
  /* la boucle : une mesure par accord, huit fois, chaque accord renvoie à sa carte */
  const mesures = [...doc.querySelectorAll('#jlh-boucle .measure')];
  assert.deepEqual(mesures.map(m => m.textContent.trim()), ['A', 'E', 'Bm7', 'D']);
  assert.deepEqual(mesures.map(m => m.querySelector('a').getAttribute('href')), ACCORDS.map(a => '#jlh-' + a.id));
  assert.match(doc.querySelector('#jlh-boucle .repeat-tag').textContent, /×8/);
});

test('la rythmique : huit croches, 1 – 2 et – (3) et – 4, la main descend à vide sur le 3', () => {
  const { doc } = ouvrir();
  const cells = [...doc.querySelectorAll('#jlh-grille .jlh-cell')];
  assert.equal(cells.length, 8);
  cells.forEach(c => assert.equal(isVisible(c), true));
  assert.deepEqual(cells.map(c => c.querySelector('.compte').textContent), ['1', 'et', '2', 'et', '3', 'et', '4', 'et']);
  assert.deepEqual(cells.map(c => c.querySelector('.coup').textContent), ['↓', '', '↓', '↑', '(↓)', '↑', '↓', '']);
  assert.deepEqual(cells.map(c => c.querySelector('.coup').classList.contains('fantome')),
    [false, false, false, false, true, false, false, false]);
  assert.match(doc.getElementById('jlh-rythme').textContent,
    /La main fait bas-haut en continu sans s'arrêter, on touche les cordes ou pas\./);
});

test('le riff recopie la feuille du prof, colonne par colonne, sans durées, et le dit', () => {
  const { doc } = ouvrir();
  const svg = doc.querySelector('#jlh-riff .jlh-tab');
  assert.equal(isVisible(svg), true);
  /* trois cordes, e B G de haut en bas */
  const noms = [...svg.querySelectorAll('text')].filter(t => +t.getAttribute('x') === 12)
    .sort((a, b) => +a.getAttribute('y') - +b.getAttribute('y')).map(t => t.textContent);
  assert.deepEqual(noms, ['e', 'B', 'G']);
  /* quatre mesures : cinq barres */
  assert.equal(svg.querySelectorAll('line.mesure').length, 5);
  const barres = [...svg.querySelectorAll('line.mesure')].map(l => +l.getAttribute('x1'));
  /* chaque chiffre, lu dans l'ordre de gauche à droite puis de haut en bas */
  const cases = [...svg.querySelectorAll('text.case')]
    .map(t => ({ x:+t.getAttribute('x'), y:+t.getAttribute('y'), corde:t.dataset.corde,
                 fret:+t.textContent, note:t.dataset.note, fill:t.getAttribute('fill') }))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  const parMesure = barres.slice(0, -1).map((x0, i) => cases.filter(c => c.x > x0 && c.x < barres[i + 1]));
  assert.deepEqual(parMesure.map(m => m.map(c => [c.corde, c.fret])), RIFF);
  /* la note annoncée est bien celle de la corde et de la case, dans sa couleur */
  for (const c of cases){
    assert.equal(c.note, CHROMA[(CHROMA.indexOf(OUVERTE[c.corde]) + c.fret) % 12]);
    assert.equal(c.fill, NOTE_COLORS[c.note[0]]);
  }
  /* la dernière mesure garde les tirets de la feuille : deux colonnes sur trois cordes */
  assert.equal(svg.querySelectorAll('text.tiret').length, 6);
  const notes = doc.querySelectorAll('#jlh-tab-block .tab-note');
  assert.match(notes[0].textContent, /C# C# C# B B A A \| G# G# G# F# F# E E \| D D D C# D \| B A/);
  assert.match(notes[1].textContent, /Le rythme n'est pas noté/);
  assert.match(notes[1].textContent, /à vérifier/);
});

/* un AudioContext de théâtre : jsdom n'a pas de son. On note les buffers
   créés, les sources lancées, les oscillateurs du métronome ; on retient
   le tick de l'ordonnanceur pour le faire avancer à la main. */
function fauxSon(win){
  const journal = { sources: [], oscillateurs: [], fermes: 0, ctx: null, tick: null, horloges: 0 };
  const param = () => ({ value: 0, courbe: [], setValueAtTime(v, t){ this.courbe.push(['set', v, t]); },
    linearRampToValueAtTime(v, t){ this.courbe.push(['lin', v, t]); },
    exponentialRampToValueAtTime(v, t){ this.courbe.push(['exp', v, t]); } });
  win.AudioContext = class {
    constructor(){ this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; journal.ctx = this; }
    resume(){}
    close(){ journal.fermes++; }
    createGain(){ return { gain: param(), connect(cible){ this.cible = cible; }, disconnect(){} }; }
    createBiquadFilter(){ return { type:'', frequency: param(), connect(){} }; }
    createBuffer(canaux, len, sr){
      const data = new Float32Array(len);
      return { length: len, sampleRate: sr, data, getChannelData(){ return data; } };
    }
    createBufferSource(){
      const s = { buffer: null, connect(cible){ s.cible = cible; }, start(t){ s.debut = t; journal.sources.push(s); }, stop(t){ s.fin = t; } };
      return s;
    }
    createOscillator(){
      const o = { type: '', frequency: param(), connect(){}, start(t){ o.debut = t; journal.oscillateurs.push(o); }, stop(t){ o.fin = t; } };
      return o;
    }
  };
  /* pas de vraie horloge : elle tiendrait le processus en vie ; on tient le
     tick à la main */
  win.setInterval = (fn, ms) => { journal.tick = fn; journal.periode = ms; journal.horloges++; return journal.horloges; };
  win.clearInterval = () => { journal.horloges--; };
  return journal;
}
/* la hauteur d'un buffer Karplus-Strong : la période est la longueur du
   bruit de départ, repérée là où la boucle commence à moyenner */
function midiDe(buf){
  const d = buf.data;
  for (let N = 20; N < 2000; N++){
    if (d[N] === Math.fround(0.997 * 0.5 * (d[0] + d[1]))) return Math.round(69 + 12 * Math.log2(buf.sampleRate / N / 440));
  }
  throw new Error('période introuvable');
}
const arrondi = x => Math.round(x * 1000) / 1000;

test('le lecteur : ▶ Jouer / ■ Stop, tempo de 50 à 160 (80 par défaut), métronome coché', () => {
  const { doc } = ouvrir();
  const bouton = doc.getElementById('jlh-play'), bpm = doc.getElementById('jlh-bpm');
  assert.equal(isVisible(bouton), true);
  assert.equal(bouton.textContent, '▶ Jouer');
  assert.equal(bouton.getAttribute('aria-pressed'), 'false');
  assert.deepEqual([bpm.min, bpm.max, bpm.value], ['50', '160', '80']);
  assert.equal(doc.getElementById('jlh-bpm-val').textContent, '80 bpm');
  assert.equal(doc.getElementById('jlh-metro').checked, true);
});

test('à 80 : un buffer par note MIDI, les coups bas du grave à l\'aigu, les coups haut sur quatre cordes, le clic aigu sur le 1', () => {
  const { doc, win } = ouvrir();
  const son = fauxSon(win);
  const bouton = doc.getElementById('jlh-play');
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'true');
  assert.equal(bouton.textContent, '■ Stop');
  assert.equal(son.periode, 25);
  /* la première croche part tout de suite, sans attendre le premier tick */
  assert.equal(son.sources.length, 5, 'le coup bas de A : cinq cordes');
  /* on fait avancer l'horloge de 0,1 s en 0,1 s sur quatre mesures : 32 croches
     de 0,375 s, la dernière à 11,725 s ; on s'arrête avant que l'horizon de
     120 ms n'attrape la cinquième mesure (12,1 s) */
  for (let t = 0.1; t < 11.9; t += 0.1){ son.ctx.currentTime = t; son.tick(); }
  const croche = 0.375, t0 = 0.1;
  /* les coups, regroupés par départ (les cordes d'un même coup se suivent à 11 ms) */
  const coups = [];
  for (const s of son.sources){
    const dernier = coups[coups.length - 1];
    if (dernier && s.debut - dernier.t < 0.1) dernier.cordes.push(s); else coups.push({ t: s.debut, cordes: [s] });
  }
  const parMesure = [[0, 'd'], [2, 'd'], [3, 'u'], [5, 'u'], [6, 'd']];
  const attendus = [0, 1, 2, 3].flatMap(m => parMesure.map(([k, sens]) => ({ t: arrondi(t0 + (m * 8 + k) * croche), sens, accord: ACCORDS[m] })));
  assert.equal(coups.length, attendus.length, 'cinq coups par mesure sur quatre mesures');
  coups.forEach((c, i) => {
    const a = attendus[i];
    assert.equal(arrondi(c.t), a.t, 'coup ' + i);
    const midis = c.cordes.map(s => midiDe(s.buffer));
    const vol = c.cordes.map(s => s.cible.gain.value);
    if (a.sens === 'd'){
      assert.deepEqual(midis, a.accord.midi, 'coup bas : toutes les cordes de ' + a.accord.id + ', du grave à l\'aigu');
      vol.forEach(v => assert.equal(v, 0.2));
    } else {
      assert.deepEqual(midis, a.accord.midi.slice(-4).reverse(), 'coup haut : les quatre aiguës de ' + a.accord.id + ', de l\'aigu au grave');
      vol.forEach(v => assert.equal(v, 0.14));
    }
    c.cordes.forEach((s, j) => assert.ok(Math.abs(s.debut - c.t - j * 0.011) < 1e-9, 'décalage de 11 ms entre cordes'));
  });
  /* chaque coup coupe le précédent : ses cordes s'arrêtent 50 ms après le nouveau coup */
  for (let i = 1; i < coups.length; i++){
    coups[i - 1].cordes.forEach(s => assert.ok(Math.abs(s.fin - (coups[i].t + 0.05)) < 1e-9, 'coup ' + (i - 1) + ' coupé'));
  }
  /* le métronome : un clic par temps, le 1 plus aigu */
  const clics = son.oscillateurs.filter(o => o.type === 'square');
  assert.equal(clics.length, 16);
  clics.forEach((c, i) => {
    assert.equal(arrondi(c.debut), arrondi(t0 + i * 2 * croche));
    assert.equal(c.frequency.value, i % 4 === 0 ? 1800 : 1200);
  });
  /* la boucle reprend sur A à la cinquième mesure */
  son.sources.length = 0;
  for (let t = 12; t < 12.3; t += 0.1){ son.ctx.currentTime = t; son.tick(); }
  assert.deepEqual(son.sources.map(s => midiDe(s.buffer)), ACCORDS[0].midi);
});

test('le tempo et le métronome se changent en cours de route, Stop et le changement d\'onglet coupent tout', () => {
  const { doc, win } = ouvrir();
  const son = fauxSon(win);
  const bouton = doc.getElementById('jlh-play'), bpm = doc.getElementById('jlh-bpm'), metro = doc.getElementById('jlh-metro');
  bouton.click();
  assert.equal(son.horloges, 1);
  /* à 120, une croche dure 0,25 s : les coups suivants se resserrent */
  bpm.value = '120';
  bpm.dispatchEvent(new win.Event('input', { bubbles: true }));
  assert.equal(doc.getElementById('jlh-bpm-val').textContent, '120 bpm');
  metro.checked = false;
  son.sources.length = 0; son.oscillateurs.length = 0;
  for (let t = 0.1; t < 0.1 + 8 * 0.25; t += 0.1){ son.ctx.currentTime = t; son.tick(); }
  const departs = [];
  for (const s of son.sources){
    const t = arrondi(s.debut);
    if (!departs.length || t - departs[departs.length - 1] > 0.1) departs.push(t);
  }
  /* la croche 1 était déjà placée à l'ancien tempo (0,475 s) ; à partir de là,
     les coups des croches 2, 3, 5 et 6 se suivent à 0,25 s */
  assert.deepEqual(departs, [0.725, 0.975, 1.475, 1.725]);
  assert.equal(son.oscillateurs.filter(o => o.type === 'square').length, 0, 'métronome décoché : plus de clic');
  /* Stop */
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'false');
  assert.equal(bouton.textContent, '▶ Jouer');
  assert.equal(son.fermes, 1);
  assert.equal(son.horloges, 0);
  assert.equal(doc.querySelectorAll('#jlh .on, #jlh .flash').length, 0);
  /* on relance, puis on change d'onglet : le son s'arrête */
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'true');
  openTab(doc, 'basse');
  assert.equal(bouton.getAttribute('aria-pressed'), 'false');
  assert.equal(son.fermes, 2);
});

test('la case et l\'accord en cours s\'allument en rythme', async () => {
  const { doc, win } = ouvrir();
  fauxSon(win);
  doc.getElementById('jlh-play').click();
  /* la première croche est programmée 100 ms après le départ */
  await new Promise(r => setTimeout(r, 250));
  const cells = [...doc.querySelectorAll('#jlh-grille .jlh-cell')];
  assert.deepEqual(cells.map(c => c.classList.contains('on')), [true, false, false, false, false, false, false, false]);
  const mesures = [...doc.querySelectorAll('#jlh-boucle .measure')];
  assert.deepEqual(mesures.map(m => m.classList.contains('on')), [true, false, false, false]);
  const cartes = [...doc.querySelectorAll('#jlh-chords .chord-card')];
  assert.deepEqual(cartes.map(c => c.classList.contains('flash')), [true, false, false, false]);
  doc.getElementById('jlh-play').click();
  assert.equal(doc.querySelectorAll('#jlh .on, #jlh .flash').length, 0);
});
