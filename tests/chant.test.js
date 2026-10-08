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

test("les quatre sections sont rendues et visibles, numérotées comme les sommaires", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  const ids = ['chants', 'placer', 'intervalles', 'reglages'];
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
  assert.equal(sticky.length, 4);
  assert.equal(side.length, 4);
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

/* une voix plus proche du vrai : vibrato, harmoniques plus fortes que la
   fondamentale, souffle. L'ancienne autocorrélation se trompait sur un tiers
   de ces trames (d'une quinte, d'une octave et demie) : la bille collait au
   bord de la jauge (4 octobre 2026). */
function voix(f, sr, n, harm, souffle, t0){
  const b = new Float32Array(n);
  let ph = 0, x = 99 + t0;
  for (let i = 0; i < n; i++){
    const fi = f * Math.pow(2, 0.3 / 12 * Math.sin(2 * Math.PI * 5.5 * (t0 + i) / sr));
    ph += 2 * Math.PI * fi / sr;
    let v = 0;
    harm.forEach((g, k) => { v += g * Math.sin((k + 1) * ph + k); });
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    b[i] = v * 0.1 + (x / 0x7fffffff - 0.5) * souffle;
  }
  return b;
}

test("une vraie voix — vibrato, harmoniques fortes, souffle — est lue à moins d'un demi-ton", () => {
  const { win } = load();
  const { detecterHauteur, freqVersMidi } = win.chant;
  const timbres = { grave:[.4, 1, .8, .5, .3, .2, .15, .1], clair:[1, .5, .3, .1], creux:[.2, 1, .2, .6, .1] };
  const rates = [];
  for (const [nom, h] of Object.entries(timbres))
    for (const f of [82, 110, 147, 196, 262, 349, 440, 587])
      for (const souffle of [0, .02, .05])
        for (let k = 0; k < 3; k++){
          const r = detecterHauteur(voix(f, 48000, 2048, h, souffle, k * 800), 48000);
          const c = r ? (freqVersMidi(r.freq) - freqVersMidi(f)) * 100 : null;
          if (c === null || Math.abs(c) > 50) rates.push(`${nom} ${f} Hz souffle ${souffle} → ${c === null ? 'rien' : Math.round(c) + ' ¢'}`);
        }
  assert.deepEqual(rates, []);
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

test("les réglages : piano, ténor, note de 3 s, mode débutant à ± 50 cents", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  assert.equal(doc.getElementById('chant-piano').checked, true);
  const voix = doc.getElementById('chant-voix');
  assert.equal(voix.value, 'tenor');
  assert.equal(voix.selectedOptions[0].textContent, 'ténor · C3 → G4');
  assert.equal([...voix.options].map(o => o.value).join(' '), 'basse baryton tenor alto mezzo soprano');
  assert.equal(doc.getElementById('chant-duree').value, '1');
  assert.equal([...doc.getElementById('chant-duree').options].map(o => o.value).join(' '), '1 2 3 4');
  assert.equal(doc.getElementById('chant-mode').value, 'debutant');
  assert.equal(doc.getElementById('chant-tol').value, '50');
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
  /* la note dure ce que dit le réglage : 1 s par défaut */
  assert.match(doc.querySelector('#placer-disque .prog').style.transition, /\b1s\b/);
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

test("octave exacte (par défaut) : la bonne note une octave trop bas ne compte pas, et le message le dit", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { placer } = win.chant;
  assert.equal(doc.getElementById('chant-octave').checked, true);
  placer.lancer(); placer.aToi();
  const cible = placer.question;
  chanter(placer, cible.midi - 12, 0, 1500);
  assert.equal(placer.phase, 'chante');
  assert.equal(doc.getElementById('placer-msg').textContent,
    `Bonne note, mauvaise octave — tu chantes ${win.chant.nomNote(cible.midi - 12).en}, monte d'une octave.`);
  chanter(placer, cible.midi + 24, 1600, 300);
  assert.match(doc.getElementById('placer-msg').textContent, /mauvaise octave.*descends de 2 octaves/);
  /* une autre note à plus d'une octave : l'écart est dit en octaves et demi-tons */
  chanter(placer, cible.midi - 14, 2000, 300);
  assert.match(doc.getElementById('placer-msg').textContent, /Trop bas.*monte d'une octave et 2 demi-tons/);
  chanter(placer, cible.midi, 2400, 1200);
  assert.equal(placer.phase, 'bravo');
  placer.arreter();
  win.close();
});

test("octave libre (décochée) : la même note une octave plus bas est juste", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { placer } = win.chant;
  const box = doc.getElementById('chant-octave');
  box.checked = false;
  box.dispatchEvent(new win.Event('change'));
  placer.lancer(); placer.aToi();
  chanter(placer, placer.question.midi - 12, 0, 1200);
  assert.equal(placer.phase, 'bravo');
  placer.arreter();
  win.close();
});

test("les intervalles en octave exacte : l'arrivée une octave trop bas est signalée, pas validée", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { inter, nomNote } = win.chant;
  /* une quinte : pour l'octave, l'arrivée une octave plus bas serait le départ */
  for (const c of doc.querySelectorAll('#int-choices input')) c.checked = c.value === '7';
  inter.lancer(); inter.aToi();
  const q = inter.question;
  chanter(inter, q.target.midi - 12, 0, 1500);
  assert.equal(inter.phase, 'chante');
  assert.match(doc.getElementById('int-msg').textContent,
    new RegExp(`mauvaise octave — tu chantes ${nomNote(q.target.midi - 12).en.replace('♯', '.')}, monte d'une octave`));
  chanter(inter, q.target.midi, 1600, 1200);
  assert.equal(inter.phase, 'bravo');
  inter.arreter();
  win.close();
});

test("l'intervalle d'octave : chanter le départ dit « départ », pas « mauvaise octave »", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { inter } = win.chant;
  for (const c of doc.querySelectorAll('#int-choices input')) c.checked = c.value === '12';
  inter.lancer(); inter.aToi();
  const q = inter.question;
  assert.equal(Math.abs(q.st), 12);
  chanter(inter, q.root.midi, 0, 1500);
  assert.equal(inter.phase, 'chante');
  assert.match(doc.getElementById('int-msg').textContent, /Tu es sur le départ/);
  inter.arreter();
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

/* ---------- les chants de la chorale (4 octobre 2026) ---------- */
const fs = require('node:fs');
const path = require('node:path');
const RACINE = path.join(__dirname, '..');

test("les cinq chants ont leur carte visible et leur lecteur", () => {
  const { doc, jsErrors } = load();
  openTab(doc, 'chant');
  const cartes = [...doc.querySelectorAll('#chants-liste .chant-carte')];
  assert.deepEqual(cartes.map(c => c.querySelector('.chant-titre').textContent),
    ['Siyahamba', 'Les anges dans nos campagnes', 'White Sand', 'Les rêves sont en nous', 'Santiano']);
  for (const c of cartes){
    assert.equal(isVisible(c), true, c.id + ' pas visible');
    assert.equal(isVisible(c.querySelector('.lecteur-jouer')), true, c.id + ' sans bouton lecture');
    assert.equal(isVisible(c.querySelector('.lecteur-barre')), true, c.id + ' sans barre');
  }
  assert.deepEqual(jsErrors, []);
});

test("chaque piste et chaque page de partition existe dans chant/", () => {
  const { win } = load();
  const { CHANTS } = win.chant.chants;
  for (const c of CHANTS){
    for (const p of c.pistes) assert.ok(fs.existsSync(path.join(RACINE, p.src)), p.src + ' manquant');
    for (const src of [c.pdf, ...(c.pages || [])].filter(Boolean))
      assert.ok(fs.existsSync(path.join(RACINE, src)), src + ' manquant');
  }
});

test("alto et soprano : un bouton par voix, il change la piste ; les rêves ont deux parties", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { lecteurs } = win.chant.chants;
  const siya = lecteurs.find(l => l.chant.id === 'siyahamba');
  const voix = [...siya.carte.querySelectorAll('[data-voix]')];
  assert.deepEqual(voix.map(b => b.textContent), ['Alto', 'Soprano']);
  voix[1].click();
  assert.match(siya.audio.src, /chant\/siyahamba-soprano\.m4a$/);
  assert.equal(voix[1].getAttribute('aria-pressed'), 'true');
  assert.equal(voix[0].getAttribute('aria-pressed'), 'false');

  const reves = lecteurs.find(l => l.chant.id === 'reves');
  const parties = [...reves.carte.querySelectorAll('[data-partie]')];
  assert.deepEqual(parties.map(b => b.textContent), ['Partie 1', 'Partie 2']);
  parties[1].click();
  /* la voix choisie sur Siyahamba est retenue pour les autres chants */
  reves.carte.querySelector('[data-voix="Soprano"]').click();
  assert.match(reves.audio.src, /chant\/reves-2-soprano\.m4a$/);

  /* un seul enregistrement : pas de choix de voix */
  const ws = lecteurs.find(l => l.chant.id === 'white-sand');
  assert.equal(ws.carte.querySelector('[data-voix]'), null);
  assert.match(ws.audio.src, /chant\/white-sand\.m4a$/);

  /* Santiano (8 octobre 2026) : trois voix, dont celle des hommes */
  const santiano = lecteurs.find(l => l.chant.id === 'santiano');
  const sv = [...santiano.carte.querySelectorAll('[data-voix]')];
  assert.deepEqual(sv.map(b => b.textContent), ['Alto', 'Soprano', 'Hommes']);
  /* la carte part sur la voix retenue à l'ouverture de l'onglet : Alto */
  assert.match(santiano.audio.src, /chant\/santiano-alto\.m4a$/);
  for (const b of sv) assert.equal(isVisible(b), true, b.textContent + ' pas visible');
  sv[2].click();
  assert.match(santiano.audio.src, /chant\/santiano-hommes\.m4a$/);
  assert.equal(sv[2].getAttribute('aria-pressed'), 'true');
  sv[1].click();
  assert.match(santiano.audio.src, /chant\/santiano-soprano\.m4a$/);
  assert.equal(santiano.carte.querySelector('.chant-sous').textContent, 'Hugues Aufray');
});

test("« Partition » ouvre la fenêtre avec les pages et le lecteur, la fermer le rend à la carte", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  const modal = doc.getElementById('chant-modal');
  assert.equal(isVisible(modal), false, 'fenêtre visible avant le clic');
  const anges = doc.getElementById('chant-anges');
  anges.querySelector('.chant-partition').click();
  assert.equal(modal.hasAttribute('open'), true);
  assert.equal(isVisible(modal), true);
  assert.equal(doc.getElementById('chant-modal-titre').textContent, 'Les anges dans nos campagnes');
  const pages = [...modal.querySelectorAll('.chant-modal-pages img')];
  assert.equal(pages.length, 1);
  assert.match(pages[0].getAttribute('src'), /chant\/anges-1\.webp$/);
  assert.match(doc.getElementById('chant-modal-pdf').getAttribute('href'), /chant\/anges\.pdf$/);
  /* le lecteur du chant est dans la fenêtre, pas ailleurs */
  assert.ok(modal.querySelector('.lecteur'), 'lecteur absent de la fenêtre');
  assert.equal(anges.querySelector('.lecteur'), null);
  assert.equal(isVisible(modal.querySelector('.lecteur-jouer')), true);

  doc.getElementById('chant-modal-fermer').click();
  if (modal.hasAttribute('open')) modal.dispatchEvent(new win.Event('close'));
  assert.equal(modal.hasAttribute('open'), false);
  assert.ok(anges.querySelector('.lecteur'), 'le lecteur n\'est pas revenu dans la carte');
  assert.equal(modal.querySelector('.lecteur'), null);
  assert.deepEqual(jsErrors, []);
});

test("partitions sous droits : un lien vers la page d'origine, pas de fichier hébergé", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const modal = doc.getElementById('chant-modal');
  for (const [id, href] of [['siyahamba', 'https://www.8notes.com/scores/15662.asp'],
      ['white-sand', 'https://www.music-for-music-teachers.com/traditional-kids-songs.html']]){
    const c = doc.getElementById('chant-' + id);
    const lien = c.querySelector('a.chant-partition');
    assert.ok(lien, id + ' sans lien');
    assert.equal(isVisible(lien), true, id + ' : lien invisible');
    assert.equal(lien.getAttribute('href'), href);
    assert.equal(lien.getAttribute('target'), '_blank');
    assert.match(lien.getAttribute('rel'), /noopener/);
    assert.equal(c.querySelector('.chant-sans'), null, id);
    /* le lien ne doit pas ouvrir la fenêtre des pages */
    lien.addEventListener('click', e => e.preventDefault());
    lien.click();
    assert.equal(modal.hasAttribute('open'), false, id + ' : la fenêtre s\'est ouverte');
  }
  /* aucun chant ne pointe vers un fichier de partition absent du dépôt */
  for (const c of win.chant.chants.CHANTS) if (c.source) assert.equal(c.pages, undefined, c.id);
});

test("pas de bouton partition sans pages ni source — ni pour les rêves, dont la copie interdit le partage", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  for (const id of ['reves', 'santiano']){
    const c = doc.getElementById('chant-' + id);
    assert.equal(c.querySelector('.chant-partition'), null, id);
    assert.ok(c.querySelector('.chant-sans'), id);
  }
});

/* ---------- mode débutant, test du micro, « Trouver ma voix » (4 octobre 2026) ---------- */

test("mode débutant : la jauge couvre une octave de chaque côté, nomme les notes, et la bille ne colle pas au bord", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  const { placer, nomNote } = win.chant;
  placer.lancer(); placer.aToi();
  const cible = placer.question;
  const textes = [...doc.querySelectorAll('#placer-gauge .graduations text')].map(t => t.textContent);
  assert.ok(textes.includes(cible.lettre + cible.alt), 'la cible n\'est pas nommée sur la jauge');
  /* la même note à l'octave, nommée en entier aux deux bouts */
  assert.ok(textes.includes(nomNote(cible.midi - 12).en) && textes.includes(nomNote(cible.midi + 12).en), textes.join(' '));
  assert.equal(doc.querySelectorAll('#placer-gauge .graduations line').length, 25);
  const billeX = () => +doc.querySelector('#placer-gauge .bille').getAttribute('transform').match(/translate\(([\d.]+)/)[1];
  /* quatre demi-tons trop haut : la bille est à 4/12 de la demi-jauge, pas en butée */
  chanter(placer, cible.midi + 4, 0, 400);
  assert.ok(Math.abs(billeX() - (320 + 280 * 4 / 12)) < 1, 'bille à ' + billeX());
  /* octave libre : la jauge revient à ± 6 demi-tons */
  const box = doc.getElementById('chant-octave');
  box.checked = false;
  box.dispatchEvent(new win.Event('change'));
  assert.equal(doc.querySelectorAll('#placer-gauge .graduations line').length, 13);
  chanter(placer, cible.midi + 4, 450, 400);
  assert.ok(Math.abs(billeX() - (320 + 280 * 4 / 6)) < 1, 'bille à ' + billeX());
  assert.match(doc.getElementById('placer-msg').textContent, new RegExp('tu chantes ' + win.chant.nomNote(cible.midi + 4).en.replace('♯', '.')));
  /* un demi-ton de tolérance : 45 cents à côté, c'est juste */
  chanter(placer, cible.midi + 0.45, 900, 1100);
  assert.equal(placer.phase, 'bravo');
  placer.arreter();
  assert.deepEqual(jsErrors, []);
});

test("mode confirmé : retour à la jauge au cent près et à ± 35 cents", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const mode = doc.getElementById('chant-mode');
  mode.value = 'confirme';
  mode.dispatchEvent(new win.Event('change'));
  assert.equal(doc.getElementById('chant-tol').value, '35');
  const textes = [...doc.querySelectorAll('#placer-gauge .graduations text')].map(t => t.textContent);
  assert.deepEqual(textes, ['↓ trop bas', 'juste', 'trop haut ↑']);
  const zone = doc.querySelector('#placer-gauge .zone');
  assert.ok(Math.abs(+zone.getAttribute('width') - 2 * 35 * 560 / 300) < 0.01);
  mode.value = 'debutant';
  mode.dispatchEvent(new win.Event('change'));
  assert.equal(doc.getElementById('chant-tol').value, '50');
});

test("le test du micro et « Trouver ma voix » sont visibles dans les réglages", () => {
  const { doc } = load();
  openTab(doc, 'chant');
  for (const id of ['chant-mic', 'chant-lu', 'chant-trouver', 'chant-test-msg', 'chant-mode', 'chant-octave'])
    assert.equal(isVisible(doc.getElementById(id)), true, id + ' pas visible');
});

test("« Trouver ma voix » : la note grave puis l'aiguë tenues deviennent la tessiture des jeux", () => {
  const { doc, win, jsErrors } = load();
  openTab(doc, 'chant');
  const { testeur, placer, nomNote } = win.chant;
  const lu = doc.querySelector('#chant-lu .note');
  testeur.commencer(0);
  assert.equal(testeur.etape, 'grave');
  assert.match(doc.getElementById('chant-test-msg').textContent, /plus grave/);
  let t = 0;
  /* on arrive en glissant sur D3, puis on tient */
  for (let i = 0; i < 20; i++, t += 16) testeur.trame({ midi: 47 + i * 0.15, freq: 0 }, t);
  for (let i = 0; i < 80; i++, t += 16) testeur.trame({ midi: 50.1, freq: 147 }, t);
  assert.equal(lu.textContent, 'D3');
  assert.equal(testeur.etape, 'aigu');
  for (let i = 0; i < 90; i++, t += 16) testeur.trame({ midi: 68.8, freq: 415 }, t);
  assert.equal(testeur.etape, null);
  assert.match(doc.getElementById('chant-test-msg').textContent, /D3 → A4/);
  const voix = doc.getElementById('chant-voix');
  assert.equal(voix.value, 'mesuree');
  assert.equal(voix.selectedOptions[0].textContent, 'ma voix · D3 → A4');
  /* les jeux tirent dans la voix mesurée */
  for (let k = 0; k < 30; k++){
    placer.lancer();
    assert.ok(placer.question.midi >= 50 && placer.question.midi <= 69, nomNote(placer.question.midi).en);
    placer.arreter();
  }
  assert.deepEqual(jsErrors, []);
});

test("« Trouver ma voix » refuse un écart de moins d'une quinte", () => {
  const { doc, win } = load();
  openTab(doc, 'chant');
  const { testeur, voixMesuree } = win.chant;
  assert.equal(voixMesuree(50, 55), null);
  assert.deepEqual({ ...voixMesuree(69.2, 50.4) }, { id:'mesuree', nom:'ma voix', lo:50, hi:69 });
  testeur.commencer(0);
  let t = 0;
  for (let i = 0; i < 90; i++, t += 16) testeur.trame({ midi: 55, freq: 196 }, t);
  for (let i = 0; i < 90; i++, t += 16) testeur.trame({ midi: 58, freq: 233 }, t);
  assert.equal(testeur.etape, null);
  assert.match(doc.getElementById('chant-test-msg').textContent, /quinte/);
  assert.equal(doc.getElementById('chant-voix').value, 'tenor');
});
