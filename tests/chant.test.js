'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

const BASE = 'https://reliefapps.github.io/guitare/';

/* L'onglet Chant affiche volontairement le nom français sous la lettre —
   c'est ce que Raphaël a demandé pour le chant. Il n'est donc pas dans la
   liste NOUVEAU de notation.test.js, qui vérifie les fiches basse. */

test("la page chant répond à #/chant et s'ouvre par l'onglet", () => {
  const { doc, win, jsErrors } = load(BASE + '#/chant');
  const page = doc.getElementById('page-chant');
  assert.ok(page, '#page-chant absent');
  assert.equal(page.hidden, false);
  assert.equal(doc.title, 'Chant · Mes fiches');
  assert.equal(doc.querySelector('.pagetab[data-page="chant"]').getAttribute('aria-selected'), 'true');
  openTab(doc, 'guitare');
  assert.equal(page.hidden, true);
  openTab(doc, 'chant');
  assert.equal(win.location.hash, '#/chant');
  assert.deepEqual(jsErrors, []);
});

test("les trois sections sont rendues et visibles, numérotées comme les sommaires", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  const ids = ['reglages', 'placer', 'intervalles'];
  ids.forEach((id, i) => {
    const sec = doc.getElementById(id);
    assert.ok(sec, id + ' absent');
    assert.equal(isVisible(sec), true, id + ' rendu mais pas visible');
    assert.equal(sec.querySelector('.sec-num').textContent, String(i));
  });
  /* sommaire collant et menu latéral d'accord avec les sections */
  const sticky = [...doc.querySelectorAll('#page-chant nav.sticky a')].map(a => a.getAttribute('href'));
  const side = [...doc.querySelectorAll('#sidenav-links-chant a')].map(a => a.getAttribute('href'));
  assert.deepEqual(sticky, ids.map(i => '#' + i));
  assert.deepEqual(side, ids.map(i => '#' + i));
  /* les deux studios et leurs jauges */
  assert.equal(isVisible(doc.getElementById('placer-gauge')), true);
  assert.equal(isVisible(doc.getElementById('int-ladder')), true);
  assert.ok(doc.querySelectorAll('#placer-gauge text').length >= 8, 'jauge sans graduations');
});

test("les noms de notes : lettre anglaise, et le nom français une octave en dessous", () => {
  const { win } = load();
  const { nomNote } = win.chant;
  assert.deepEqual([nomNote(60).en, nomNote(60).fr], ['C4', 'do3']);
  assert.deepEqual([nomNote(61).en, nomNote(61).fr], ['C♯4', 'do♯3']);
  assert.deepEqual([nomNote(69).en, nomNote(69).fr], ['A4', 'la3']);
  assert.deepEqual([nomNote(48).en, nomNote(48).fr], ['C3', 'do2']);
  assert.deepEqual([nomNote(59).en, nomNote(59).fr], ['B3', 'si2']);
  /* une couleur par note, la même que sur le manche */
  assert.equal(nomNote(64).couleur, win.NOTE_COLORS.E);
  assert.equal(nomNote(66).couleur, win.NOTE_COLORS.F);
  assert.ok(Math.abs(win.chant.midiVersFreq(69) - 440) < 1e-9);
  assert.ok(Math.abs(win.chant.freqVersMidi(261.63) - 60) < 0.01);
});

/* un signal de synthèse : la détection doit retrouver la fréquence */
function sinus(freq, sampleRate, n, harmoniques){
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++){
    let v = 0;
    (harmoniques || [[1, 1]]).forEach(([k, g]) => { v += g * Math.sin(2 * Math.PI * freq * k * i / sampleRate); });
    buf[i] = v * 0.3;
  }
  return buf;
}

test("la détection de hauteur retrouve une sinusoïde à moins de 1 cent", () => {
  const { win } = load();
  const { detecterHauteur, freqVersMidi } = win.chant;
  for (const f of [130.81, 196, 261.63, 329.63, 440, 523.25]){
    const r = detecterHauteur(sinus(f, 48000, 2048), 48000);
    assert.ok(r, 'rien détecté à ' + f + ' Hz');
    const cents = (freqVersMidi(r.freq) - freqVersMidi(f)) * 100;
    assert.ok(Math.abs(cents) < 1, f + ' Hz → ' + r.freq.toFixed(2) + ' Hz (' + cents.toFixed(1) + ' ¢)');
  }
});

test("une voix riche en harmoniques ne fait pas d'erreur d'octave", () => {
  const { win } = load();
  const { detecterHauteur, freqVersMidi } = win.chant;
  /* ténor sur E3 : fondamentale plus faible que la deuxième harmonique */
  const r = detecterHauteur(sinus(164.81, 44100, 2048, [[1, .6], [2, 1], [3, .5], [4, .3]]), 44100);
  assert.ok(r);
  assert.ok(Math.abs(freqVersMidi(r.freq) - 52) < 0.05, 'E3 lu comme ' + r.freq.toFixed(1) + ' Hz');
});

test("le silence et le bruit ne donnent pas de note", () => {
  const { win } = load();
  const { detecterHauteur } = win.chant;
  assert.equal(detecterHauteur(new Float32Array(2048), 48000), null);
  const bruit = new Float32Array(2048);
  let x = 12345;
  for (let i = 0; i < bruit.length; i++){ x = (x * 1103515245 + 12345) & 0x7fffffff; bruit[i] = (x / 0x7fffffff - 0.5) * 0.4; }
  assert.equal(detecterHauteur(bruit, 48000), null);
});

test("une note tenue : stable après la durée, remise à zéro si la voix bouge", () => {
  const { win } = load();
  const t = new win.chant.Tenue();
  let e;
  for (let ms = 0; ms <= 900; ms += 50) e = t.pousser({ midi: 64 + (ms % 100 ? .1 : -.1), t: ms }, ms, 1000);
  assert.equal(e.stable, false);
  assert.ok(e.progress > 0.8 && e.progress < 1);
  e = t.pousser({ midi: 64.05, t: 1050 }, 1050, 1000);
  assert.equal(e.stable, true);
  assert.ok(Math.abs(e.midi - 64) < 0.15);
  /* la voix saute d'un ton : on repart */
  e = t.pousser({ midi: 66, t: 1100 }, 1100, 1000);
  assert.equal(e.stable, false);
  assert.equal(t.pts.length, 1);
  /* le silence prolongé aussi */
  e = t.pousser(null, 1300, 1000);
  assert.equal(e.progress, 0);
});

test("les intervalles : douze au choix, les cinq du début cochés, noms corrects", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const cases = [...doc.querySelectorAll('#int-choices input')];
  assert.equal(cases.length, 12);
  assert.deepEqual(cases.filter(c => c.checked).map(c => +c.value), [3, 4, 5, 7, 12]);
  assert.equal(win.chant.nomIntervalle(4), 'tierce majeure');
  assert.equal(win.chant.nomIntervalle(-7), 'quinte juste');
  assert.equal(win.chant.nomIntervalle(12), 'octave');
  assert.equal(win.chant.nomIntervalle(0), 'unisson');
});

test("les réglages : piano par défaut, tessiture C3 → G4, tolérance ± 20 cents", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  assert.equal(doc.getElementById('chant-piano').checked, true);
  const low = doc.getElementById('chant-low'), high = doc.getElementById('chant-high');
  assert.equal(low.value, '48');
  assert.equal(high.value, '67');
  assert.equal(low.selectedOptions[0].textContent, 'C3 · do2');
  assert.equal(high.selectedOptions[0].textContent, 'G4 · sol3');
  assert.equal(doc.getElementById('chant-tol').value, '20');
  /* la tessiture ne peut pas se retourner */
  low.value = '70'; low.dispatchEvent(new doc.defaultView.Event('change'));
  assert.ok(+high.value > +low.value);
});

test("sans micro, « Chanter » explique le problème au lieu de planter", async () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  doc.getElementById('placer-listen').click();
  await new Promise(r => win.setTimeout(r, 20));
  assert.match(doc.getElementById('placer-feedback').textContent, /micro/i);
  assert.equal(doc.getElementById('placer-listen').getAttribute('aria-pressed'), 'false');
  assert.deepEqual(jsErrors, []);
});
