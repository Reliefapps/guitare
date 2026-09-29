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
  const ids = ['placer', 'intervalles', 'reglages'];
  ids.forEach((id, i) => {
    const sec = doc.getElementById(id);
    assert.ok(sec, id + ' absent');
    assert.equal(isVisible(sec), true, id + ' rendu mais pas visible');
    assert.equal(sec.querySelector('.sec-num').textContent, String(i + 1));
  });
  /* sommaire collant et menu latéral d'accord avec les sections */
  const sticky = [...doc.querySelectorAll('#page-chant nav.sticky a')];
  const side = [...doc.querySelectorAll('#sidenav-links-chant a')];
  ids.forEach((id, i) => {
    assert.equal(sticky[i].getAttribute('href'), '#' + id);
    assert.equal(side[i].getAttribute('href'), '#' + id);
    assert.ok(sticky[i].textContent.startsWith((i + 1) + ' · '));
    assert.ok(side[i].textContent.startsWith((i + 1) + ' · '));
  });
  assert.equal(sticky.length, 3);
  assert.equal(side.length, 3);
  /* les deux scènes, leur jauge et leur bouton */
  for (const id of ['placer-jeu', 'placer-gauge', 'placer-go', 'int-jeu', 'int-ladder', 'int-go']){
    assert.equal(isVisible(doc.getElementById(id)), true, id + ' pas visible');
  }
  assert.ok(doc.querySelector('#placer-gauge .zone'), 'jauge sans zone verte');
  assert.ok(doc.querySelector('#placer-gauge .bille'), 'jauge sans bille');
});

test("l'entête reste court : un titre, pas de paragraphe d'explication", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  const hero = doc.querySelector('#page-chant header.hero');
  assert.ok(hero.querySelector('h1'));
  assert.equal(hero.querySelector('.lead'), null);
  assert.equal(hero.querySelector('.tuning'), null);
  for (const h of doc.querySelectorAll('#page-chant .hint')){
    assert.ok(h.textContent.length < 120, 'consigne trop longue : ' + h.textContent);
  }
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

test("une note tenue : le temps dans le vert s'accumule, et fond sans repartir de zéro", () => {
  const { win } = load();
  const m = new win.chant.Maintien();
  let e;
  for (let ms = 0; ms <= 600; ms += 50) e = m.pousser(true, ms, 1000);
  assert.equal(e.atteint, false);
  assert.ok(Math.abs(e.progress - 0.6) < 0.01);
  /* la voix sort 100 ms : on perd 150 ms, pas tout */
  for (let ms = 650; ms <= 700; ms += 50) e = m.pousser(false, ms, 1000);
  assert.ok(Math.abs(e.progress - 0.45) < 0.01, 'progress ' + e.progress);
  for (let ms = 750; ms <= 1250; ms += 50) e = m.pousser(true, ms, 1000);
  assert.equal(e.atteint, true);
  /* un onglet qui cale ne compte que pour 100 ms */
  m.reset();
  m.pousser(true, 0, 1000);
  e = m.pousser(true, 5000, 1000);
  assert.ok(Math.abs(e.progress - 0.1) < 0.01);
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

test("les réglages : piano, ténor, note de 3 s, tolérance indulgente", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  assert.equal(doc.getElementById('chant-piano').checked, true);
  const voix = doc.getElementById('chant-voix');
  assert.equal(voix.value, 'tenor');
  assert.equal(voix.selectedOptions[0].textContent, 'ténor · C3 → G4');
  assert.equal([...voix.options].map(o => o.value).join(' '), 'basse baryton tenor alto mezzo soprano');
  assert.equal(doc.getElementById('chant-duree').value, '3');
  assert.equal(doc.getElementById('chant-tol').value, '35');
  assert.equal(doc.getElementById('chant-hold').value, '1000');
  /* chaque voix couvre une douzième, de plus en plus haut */
  let avant = 0;
  for (const v of win.chant.VOIX){
    assert.equal(v.hi - v.lo, 19, v.nom);
    assert.ok(v.lo > avant, v.nom);
    avant = v.lo;
  }
  assert.equal(doc.getElementById('chant-low'), null);
});

test("sans micro, « Jouer » explique le problème au lieu de planter", async () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  doc.getElementById('placer-go').click();
  await new Promise(r => win.setTimeout(r, 20));
  assert.match(doc.getElementById('placer-msg').textContent, /micro/i);
  assert.equal(win.chant.placer.phase, 'repos');
  assert.equal(doc.getElementById('placer-jeu').dataset.phase, 'repos');
  assert.deepEqual(jsErrors, []);
});

/* chante une hauteur fixe pendant `ms` millisecondes, une trame toutes les 50 */
function chanter(jeu, midi, debut, ms){
  for (let t = debut; t <= debut + ms; t += 50) jeu.trame({ midi, t }, t);
  return debut + ms + 50;
}

test("placer la note : la note joue, puis le micro, puis la note tenue est validée", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  const { placer } = win.chant;
  const scene = doc.getElementById('placer-jeu');
  placer.lancer();
  assert.equal(scene.dataset.phase, 'ecoute');
  const cible = placer.question;
  assert.ok(cible.midi >= 48 && cible.midi <= 67, 'hors de la tessiture du ténor');
  assert.equal(doc.getElementById('placer-note').textContent, cible.en);
  assert.equal(doc.getElementById('placer-fr').textContent, cible.fr);
  /* pendant que la note joue, la voix n'est pas jugée */
  chanter(placer, cible.midi, 0, 1500);
  assert.equal(placer.phase, 'ecoute');

  placer.aToi();
  assert.equal(scene.dataset.phase, 'chante');
  assert.equal(scene.querySelector('.jeu-phase .txt').textContent, 'À toi, chante');
  /* un ton trop bas : la bille est à gauche, le message dit de monter */
  let t = chanter(placer, cible.midi - 2, 0, 1500);
  assert.equal(placer.phase, 'chante');
  assert.match(doc.getElementById('placer-msg').textContent, /Trop bas.*monte de 2 demi-tons/);
  assert.equal(doc.querySelector('#placer-gauge .bille').getAttribute('opacity'), '1');
  /* juste, à 20 cents près : dans le vert, puis validé après une seconde */
  t = chanter(placer, cible.midi + 0.2, t, 500);
  assert.equal(placer.phase, 'chante');
  assert.equal(scene.classList.contains('dedans'), true);
  assert.match(doc.getElementById('placer-msg').textContent, /Juste/);
  chanter(placer, cible.midi + 0.2, t, 700);
  assert.equal(placer.phase, 'bravo');
  assert.equal(placer.stats.serie, 1);
  assert.equal(scene.querySelector('.jeu-stat.serie b').textContent, '1');
  placer.arreter();
  assert.equal(scene.dataset.phase, 'repos');
  assert.deepEqual(jsErrors, []);
  win.close();
});

test("placer la note : la même note une octave plus bas est juste", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { placer } = win.chant;
  placer.lancer(); placer.aToi();
  chanter(placer, placer.question.midi - 12, 0, 1200);
  assert.equal(placer.phase, 'bravo');
  win.close();
});

test("« Passer » tire une autre note et remet la série à zéro", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { placer } = win.chant;
  placer.lancer(); placer.aToi();
  chanter(placer, placer.question.midi, 0, 1200);
  assert.equal(placer.stats.serie, 1);
  const avant = placer.question.midi;
  doc.getElementById('placer-next').click();
  assert.equal(placer.stats.serie, 0);
  assert.equal(placer.stats.total, 1);
  assert.notEqual(placer.question.midi, avant);
  assert.equal(placer.phase, 'ecoute');
  win.close();
});

test("les intervalles : l'arrivée reste cachée jusqu'à ce qu'elle soit chantée", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  const { inter, nomIntervalle } = win.chant;
  inter.lancer();
  const q = inter.question;
  assert.ok([3, 4, 5, 7, 12].includes(q.st), 'intervalle hors du choix par défaut : ' + q.st);
  assert.equal(q.target.midi, q.root.midi + q.st);
  assert.ok(q.target.midi <= 67, "l'arrivée sort de la tessiture");
  assert.equal(doc.getElementById('int-root').textContent, q.root.en);
  assert.equal(doc.getElementById('int-name').textContent, nomIntervalle(q.st));
  assert.equal(doc.getElementById('int-target').textContent, '?');
  /* une marche par demi-ton, une de marge de chaque côté */
  assert.equal(doc.querySelectorAll('#int-ladder .step').length, q.st + 3);

  inter.aToi();
  /* sur le départ : on le dit, et rien n'est validé */
  let t = chanter(inter, q.root.midi, 0, 1500);
  assert.equal(inter.phase, 'chante');
  assert.match(doc.getElementById('int-msg').textContent, /départ/);
  chanter(inter, q.target.midi - 0.1, t, 1200);
  assert.equal(inter.phase, 'bravo');
  assert.equal(doc.getElementById('int-target').textContent, q.target.en);
  assert.equal(doc.getElementById('int-disque-cible').classList.contains('mystere'), false);
  assert.match(doc.getElementById('int-msg').textContent, new RegExp(nomIntervalle(q.st)));
  assert.equal(inter.stats.serie, 1);
  inter.arreter();
  assert.deepEqual(jsErrors, []);
  win.close();
});

test("un seul jeu écoute à la fois", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { placer, inter } = win.chant;
  placer.lancer();
  inter.lancer();
  assert.equal(placer.phase, 'repos');
  assert.equal(inter.phase, 'ecoute');
  inter.arreter();
  win.close();
});
