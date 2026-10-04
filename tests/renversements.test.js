'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* le contenu du cours du 2 octobre 2026 : la feuille « Arpeggio Exercises —
   Bass and second inversion », l'improvisation sur un seul accord et la
   transposition des formes de pentatonique */

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const CORDES = ['G','D','A','E'];          /* de haut en bas */

function hauteur(nom){
  let h = CHROMA.indexOf(nom[0]);
  for (const c of nom.slice(1)){
    if (c === '#' || c === '♯') h += 1;
    if (c === 'b' || c === '♭') h -= 1;
  }
  return ((h % 12) + 12) % 12;
}

/* les notes d'une tablature, relues depuis le SVG : chaque chiffre porte sa
   corde et sa case ; une note liée (écrite mais pas rejouée) est marquée */
function lireTablature(svg){
  return [...svg.querySelectorAll('text.case')]
    .map(t => ({
      x: +t.getAttribute('x'),
      corde: t.dataset.corde,
      fret: +t.dataset.case,
      croches: +t.dataset.croches,
      fill: t.getAttribute('fill'),
      liee: t.dataset.liee === '1',
    }))
    .sort((a, b) => a.x - b.x)
    .map(n => ({ ...n, hauteur: (CHROMA.indexOf(n.corde) + n.fret) % 12 }));
}
/* les têtes de notes de la portée, de gauche à droite */
function lirePortee(svg){
  return [...svg.querySelectorAll('.tete')]
    .map(e => ({ x: +e.getAttribute('cx'), y: +e.getAttribute('cy'), note: e.dataset.note,
      octave: +e.dataset.octave, pas: +e.dataset.pas, fill: e.getAttribute('fill') }))
    .sort((a, b) => a.x - b.x);
}
const NOTE_COLORS = { C:'#0E9594', D:'#8E44AD', E:'#2E8B57', F:'#DE4229',
                      G:'#E67E22', A:'#2C7FB8', B:'#8D6E4B' };
const compte = (svg, sel) => svg.querySelectorAll(sel).length;

/* les accords écrits au-dessus, de gauche à droite */
function lireAccords(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 12.5 && +t.getAttribute('y') < 30)
    .sort((a, b) => +a.getAttribute('x') - +b.getAttribute('x'))
    .map(t => t.textContent);
}

/* les doigtés écrits sous la tablature, de gauche à droite */
function lireDoigts(svg){
  return [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 10.5 && /^\d$/.test(t.textContent))
    .sort((a, b) => +a.getAttribute('x') - +b.getAttribute('x'))
    .map(t => t.textContent);
}

const tabsDe = (doc, id) => [...doc.querySelectorAll('#' + id + ' .tab-scroll svg')];

/* la feuille, telle qu'elle est écrite (coordonnées relevées avec
   pdftotext -bbox) : chaque mesure dans l'ordre de lecture, la note liée de
   l'exercice 2 comprise ; les doigts, seulement ceux que la feuille note ;
   reprises = les mesures suivies d'un signe « % » */
const FEUILLE = {
  'ar-1': { lignes: [{
      notes: [['E',5],['D',7],['A',7],['D',7],['G',5],['D',7],['A',7],
              ['E',8],['D',10],['A',10],['D',10],['G',9],['D',10],['A',10],
              ['E',3],['D',5],['A',5],['D',5],['G',4],['D',5],['A',5],
              ['E',1],['D',3],['A',3],['D',3],['G',2],['D',3],['A',3]],
      accords: ['Am','C','G','F'],
      doigts: ['1','4','3','1','1','4','3','2'],
      liees: 0, reprises: 0 }] },
  'ar-2': { lignes: [{
      notes: [['E',1],['A',3],['D',3],['D',3],['G',2],['D',3],['A',3],
              ['E',3],['A',5],['D',5],['D',5],['G',4],['D',5],['A',5],
              ['E',5],['A',7],['D',7],['D',7],['G',5],['D',7],['A',7],
              ['E',8],['A',10],['D',10],['D',10],['G',9],['D',10],['A',10]],
      accords: ['F','G','Am','C'],
      doigts: [],
      liees: 4, reprises: 0 }] },
  'ar-3': { lignes: [{
      notes: [['E',3],['A',5],['D',5],['G',3],['D',5],['A',5],
              ['E',1],['A',3],['D',3],['G',2],['D',3],['A',3]],
      accords: ['Gm','F'],
      doigts: [],
      liees: 0, reprises: 2 }, {
      notes: [['E',8],['A',10],['D',10],['G',8],['D',10],['A',10],
              ['E',6],['A',8],['D',8],['G',7],['D',8],['A',8],
              ['E',10],['A',12],['D',12],['G',11],['D',12],['A',12]],
      accords: ['Cm','B♭','D'],
      doigts: [],
      liees: 0, reprises: 1 }] },
};

/* la tierce de chaque accord, en demi-tons : mineure ou majeure */
const TIERCE = { Am:3, C:4, G:4, F:4, Gm:3, Cm:3, 'B♭':4, D:4 };

test('la section des arpèges est rendue, visible, avec ses trois exercices dans l\'ordre de la feuille', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('renversements');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /2 octobre 2026/);
  assert.match(sec.querySelector('.hint').textContent, /Bass and second inversion/);
  /* facultatif, et sans tempo : Santiago n'en a pas donné */
  assert.match(sec.querySelector('.rule').textContent, /Si tu as un peu plus de temps/);
  assert.match(sec.querySelector('.rule').textContent, /ni tempo ni objectif/);
  const blocs = [...doc.querySelectorAll('#renversements-list .tab-block')];
  assert.deepEqual(blocs.map(b => b.id), Object.keys(FEUILLE));
  blocs.forEach(b => {
    assert.equal(isVisible(b), true, b.id + ' rendu mais pas visible');
    assert.equal(b.querySelectorAll('.tab-scroll svg').length, FEUILLE[b.id].lignes.length, b.id);
  });
});

test('chaque exercice reproduit la feuille : mêmes cases, mêmes cordes, mêmes accords, mêmes doigts', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, ex] of Object.entries(FEUILLE)){
    const svgs = tabsDe(doc, id);
    ex.lignes.forEach((ligne, i) => {
      const notes = lireTablature(svgs[i]);
      assert.deepEqual(notes.map(n => [n.corde, n.fret]), ligne.notes, `${id} ligne ${i + 1} : la tablature diverge de la feuille`);
      assert.deepEqual(lireAccords(svgs[i]), ligne.accords, `${id} ligne ${i + 1} : accords`);
      assert.deepEqual(lireDoigts(svgs[i]), ligne.doigts, `${id} ligne ${i + 1} : doigtés différents de la feuille`);
      assert.equal(notes.filter(n => n.liee).length, ligne.liees, `${id} ligne ${i + 1} : notes liées`);
      assert.equal(svgs[i].querySelectorAll('path.liaison').length, ligne.liees, `${id} ligne ${i + 1} : arcs de liaison`);
      /* le signe « % » de la feuille : une fois sur la portée, une fois sur la tablature */
      assert.equal(compte(svgs[i], '.simile'), ligne.reprises, `${id} ligne ${i + 1} : mesures à rejouer`);
      assert.equal(compte(svgs[i], '.simile-tab'), ligne.reprises, `${id} ligne ${i + 1} : signe % de la tablature`);
      assert.equal(compte(svgs[i], 'path.liaison-portee'), ligne.liees, `${id} ligne ${i + 1} : liaisons de la portée`);
    });
  }
});

test('chaque mesure fait quatre temps : noire, noire pointée et liaison comprises', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const [id, ex] of Object.entries(FEUILLE)){
    tabsDe(doc, id).forEach((svg, i) => {
      const mesures = ex.lignes[i].accords.length;
      const et = [...svg.querySelectorAll('text')].filter(t => t.textContent === 'et');
      assert.equal(et.length, mesures * 4, `${id} ligne ${i + 1} : ${mesures} mesures de huit croches`);
    });
  }
  /* la basse tient deux croches dans les exercices 1 et 2, trois dans le 3 :
     la durée est notée, et l'écart jusqu'à la note suivante la respecte */
  const basse = id => { const n = lireTablature(tabsDe(doc, id)[0]); return [n[0].croches, n[1].x - n[0].x]; };
  assert.deepEqual(basse('ar-1'), [2, 52], 'exercice 1 : la basse est une noire');
  assert.deepEqual(basse('ar-2'), [2, 52], 'exercice 2 : la basse est une noire');
  assert.deepEqual(basse('ar-3'), [3, 78], 'exercice 3 : la basse est une noire pointée');
  /* chaque mesure fait bien huit croches, notes liées comprises */
  for (const [id, ex] of Object.entries(FEUILLE)){
    tabsDe(doc, id).forEach((svg, i) => {
      const total = lireTablature(svg).reduce((s, n) => s + n.croches, 0);
      assert.equal(total, ex.lignes[i].accords.length * 8, `${id} ligne ${i + 1}`);
    });
  }
});

test('chaque mesure joue la basse puis fondamentale, quinte et tierce de son accord', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  /* demi-tons depuis la corde de E grave */
  const CORDE = { E: 0, A: 5, D: 10, G: 15 };
  for (const [id, ex] of Object.entries(FEUILLE)){
    tabsDe(doc, id).forEach((svg, i) => {
      const notes = lireTablature(svg);
      const accords = ex.lignes[i].accords;
      const parMesure = notes.length / accords.length;
      accords.forEach((accord, m) => {
        const mes = notes.slice(m * parMesure, (m + 1) * parMesure);
        const basse = mes[0];
        assert.equal(basse.corde, 'E', `${id} ${accord} : la basse est sur la corde de E`);
        assert.equal(basse.hauteur, hauteur(accord.replace(/m$/, '')), `${id} ${accord} : la basse n'est pas la fondamentale`);
        const b = CORDE[basse.corde] + basse.fret;
        /* au-dessus : la quinte (corde de A), l'octave (corde de D), la tierce
           (corde de G) — la quinte en bas, c'est le deuxième renversement */
        for (const n of mes.slice(1)){
          const ecart = CORDE[n.corde] + n.fret - b;
          const attendu = { A: 7, D: 12, G: 12 + TIERCE[accord] }[n.corde];
          assert.equal(ecart, attendu, `${id} ${accord} : corde ${n.corde} case ${n.fret}`);
        }
        assert.deepEqual([...new Set(mes.slice(1).map(n => n.corde))].sort(), ['A','D','G']);
      });
    });
  }
});

test('la légende de chaque ligne nomme les notes attaquées, en lettres et avec les bonnes altérations', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
    for (const svg of tabsDe(doc, id)){
      const legende = svg.closest('.tab-scroll').nextElementSibling;
      assert.ok(legende && legende.classList.contains('tab-note'), id + ' : légende manquante');
      const affichees = [...legende.querySelectorAll('b')].map(b => hauteur(b.textContent.trim()));
      const jouees = lireTablature(svg).filter(n => !n.liee).map(n => n.hauteur);
      assert.deepEqual(affichees, jouees, id + ' : légende et tablature divergent');
    }
  }
  /* l'exercice 3 est écrit avec deux bémols : B♭ et E♭, pas A♯ ni D♯ —
     et le F♯ de l'accord de D reste un dièse */
  const texte = doc.getElementById('ar-3').textContent;
  assert.match(texte, /B♭/);
  assert.match(texte, /E♭/);
  assert.match(texte, /F♯/);
  assert.doesNotMatch(texte, /A♯|D♯|G♭/);
});

test('la portée en clé de fa écrit les mêmes notes que la tablature, à la bonne hauteur', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
    for (const svg of tabsDe(doc, id)){
      assert.equal(compte(svg, '.clef'), 1, id + ' : clé de fa');
      assert.equal(compte(svg, 'line.portee'), 5, id + ' : cinq lignes de portée');
      assert.equal(compte(svg, 'line.ligne-tab'), 4, id + ' : quatre lignes de tablature');
      const tab = lireTablature(svg), tetes = lirePortee(svg);
      assert.equal(tetes.length, tab.length, id + ' : une tête de note par chiffre');
      const lignes = [...svg.querySelectorAll('line.portee')].map(l => +l.getAttribute('y1')).sort((a, b) => a - b);
      const demiInterligne = (lignes[4] - lignes[0]) / 8;
      tetes.forEach((t, i) => {
        /* même abscisse, même note, même couleur que le chiffre en dessous */
        assert.equal(t.x, tab[i].x, id);
        assert.equal(hauteur(t.note), tab[i].hauteur, `${id} : ${t.note} au-dessus de ${tab[i].corde}${tab[i].fret}`);
        assert.equal(t.fill, NOTE_COLORS[t.note[0]], `${id} : ${t.note} mal colorée`);
        assert.equal(tab[i].fill, t.fill, id + ' : la tête et le chiffre ont la même couleur');
        /* la hauteur écrite : G2 sur la ligne du bas, un pas par demi-interligne */
        const pas = t.octave * 7 + 'CDEFGAB'.indexOf(t.note[0]);
        assert.equal(t.pas, pas, id);
        assert.equal(t.y, lignes[4] - (pas - 18) * demiInterligne, `${id} : ${t.note}${t.octave} mal placée`);
      });
    }
  }
  /* la première mesure de la feuille, note à note : la basse dans le premier
     interligne, l'octave sur la ligne du haut, le C au-dessus de la portée */
  const am = lirePortee(tabsDe(doc, 'ar-1')[0]).slice(0, 7);
  assert.deepEqual(am.map(t => t.note + t.octave), ['A2', 'A3', 'E3', 'A3', 'C4', 'A3', 'E3']);
  /* lignes supplémentaires : une par C4, deux par E4, aucune ailleurs */
  assert.equal(compte(tabsDe(doc, 'ar-1')[0], '.ligne-sup'), 1 + 3 + 2);
});

test('le rythme est écrit comme sur la feuille : hampes, ligatures, point, crochet, liaison', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const [ex1] = tabsDe(doc, 'ar-1'), [ex2] = tabsDe(doc, 'ar-2'), [ex3a, ex3b] = tabsDe(doc, 'ar-3');
  /* exercices 1 et 2 : par mesure, une noire seule, deux croches ligaturées,
     puis quatre — sur la portée comme sous la tablature */
  for (const svg of [ex1, ex2]){
    assert.equal(compte(svg, '.ligature'), 8);
    assert.equal(compte(svg, '.ligature-tab'), 8);
    assert.equal(compte(svg, '.crochet'), 0);
    assert.equal(compte(svg, '.point'), 0);
    /* une hampe par note, sur chaque système */
    assert.equal(compte(svg, '.hampe'), 2 * lireTablature(svg).length);
  }
  /* exercice 3 : par mesure jouée, une noire pointée, une croche seule avec
     son crochet, puis quatre croches ligaturées */
  for (const [svg, mesures] of [[ex3a, 2], [ex3b, 3]]){
    assert.equal(compte(svg, '.point'), mesures);
    assert.equal(compte(svg, '.point-tab'), mesures);
    assert.equal(compte(svg, '.crochet'), mesures);
    assert.equal(compte(svg, '.crochet-tab'), mesures);
    assert.equal(compte(svg, '.ligature'), mesures);
    assert.equal(compte(svg, '.ligature-tab'), mesures);
  }
  /* le 4/4 en tête de chaque exercice, les barres de reprise au début et à la fin */
  assert.equal(compte(ex1, '.chiffrage'), 2);
  assert.equal(compte(ex3a, '.chiffrage'), 2);
  assert.equal(compte(ex3b, '.chiffrage'), 0);
  assert.equal(compte(ex1, '.reprise'), 8, 'reprise au début et à la fin');
  assert.equal(compte(ex3a, '.reprise'), 4, 'exercice 3 : la reprise s\'ouvre sur la première ligne');
  assert.equal(compte(ex3b, '.reprise'), 4, 'et se ferme sur la seconde');
  /* l'armure de deux bémols ne vaut que pour l'exercice 3 ; les B♭ et E♭ ne
     sont donc pas réécrits, seul le F♯ de l'accord de D porte son dièse */
  assert.equal(compte(ex1, '.armure') + compte(ex2, '.armure'), 0);
  assert.equal(compte(ex3a, '.armure'), 2);
  assert.equal(compte(ex3b, '.armure'), 2);
  assert.equal(compte(ex1, '.alteration') + compte(ex2, '.alteration') + compte(ex3a, '.alteration'), 0);
  assert.deepEqual([...ex3b.querySelectorAll('.alteration')].map(t => t.textContent), ['♯']);
  assert.match(doc.querySelector('#renversements .hint').textContent, /portée en clé de fa/);
});

/* un AudioContext de théâtre : jsdom n'a pas de son, on note ce que la page
   programme — chaque oscillateur avec son type, sa fréquence et son départ */
function fauxSon(win){
  const journal = { oscillateurs: [], fermes: 0 };
  const param = () => ({ value: 0, setValueAtTime(){}, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} });
  win.AudioContext = class {
    constructor(){ this.currentTime = 0; this.destination = {}; }
    resume(){}
    close(){ journal.fermes++; }
    createGain(){ return { gain: param(), connect(){}, disconnect(){} }; }
    createOscillator(){
      const o = { type: '', frequency: param(), connect(){}, stop(t){ o.fin = t; },
        start(t){ o.debut = t; journal.oscillateurs.push(o); } };
      return o;
    }
  };
  return journal;
}
/* les départs des notes (le son pincé, en triangle), arrondis au millième
   et comptés depuis la première */
function departs(journal){
  const t = journal.oscillateurs.filter(o => o.type === 'triangle').map(o => o.debut);
  return t.map(x => Math.round((x - t[0]) * 1000) / 1000);
}

test('chaque exercice a son bouton d\'écoute et son choix de tempo, de 60 à 100', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const id of Object.keys(FEUILLE)){
    const bouton = doc.querySelector('#' + id + ' .rythme-play');
    const tempo = doc.querySelector('#' + id + ' .rythme-tempo');
    assert.equal(isVisible(bouton), true, id);
    assert.equal(bouton.textContent, '▶ Écouter le rythme');
    assert.equal(bouton.getAttribute('aria-pressed'), 'false');
    assert.deepEqual([...tempo.options].map(o => o.textContent), ['60 bpm', '70 bpm', '80 bpm', '90 bpm', '100 bpm']);
    assert.equal(tempo.value, '60');
  }
});

test('écouter l\'exercice 1 à 60 : une mesure de décompte, un clic par temps, la noire puis six croches', () => {
  const { doc, win } = load();
  openTab(doc, 'basse');
  const son = fauxSon(win);
  const bouton = doc.querySelector('#ar-1 .rythme-play');
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'true');
  assert.equal(bouton.textContent, '■ Arrêter');
  /* les clics : quatre de décompte, puis seize pour les quatre mesures ; un par seconde à 60 */
  const clics = son.oscillateurs.filter(o => o.type === 'square');
  assert.equal(clics.length, 4 + 16);
  clics.forEach((c, i) => assert.ok(Math.abs(c.debut - clics[0].debut - i) < 1e-9, 'clic ' + i));
  /* le premier temps de chaque mesure sonne plus aigu */
  assert.deepEqual(clics.map(c => c.frequency.value > 1500), clics.map((_, i) => i % 4 === 0));
  /* les notes : 7 par mesure ; la basse dure un temps, les croches un demi */
  const mesure = [0, 1, 1.5, 2, 2.5, 3, 3.5];
  assert.deepEqual(departs(son), [0, 4, 8, 12].flatMap(m => mesure.map(t => m + t)));
  const notes = son.oscillateurs.filter(o => o.type === 'triangle');
  /* la première note part après le décompte, et c'est le A écrit : 110 Hz */
  assert.ok(Math.abs(notes[0].debut - clics[4].debut) < 1e-9);
  assert.ok(Math.abs(notes[0].frequency.value - 110) < 0.01);
  assert.ok(Math.abs((notes[0].fin - notes[0].debut) - 1) < 1e-9, 'la basse est une noire');
  assert.ok(Math.abs((notes[1].fin - notes[1].debut) - 0.5) < 1e-9, 'puis des croches');
  /* le curseur est posé sur la ligne, et disparaît à l'arrêt */
  assert.equal(doc.querySelectorAll('#ar-1 .curseur').length, 1);
  bouton.click();
  assert.equal(bouton.getAttribute('aria-pressed'), 'false');
  assert.equal(bouton.textContent, '▶ Écouter le rythme');
  assert.equal(son.fermes, 1);
  assert.equal(doc.querySelectorAll('#ar-1 .curseur').length, 0);
});

test('écouter : la liaison de l\'exercice 2 ne se rejoue pas, le « % » de l\'exercice 3 rejoue la mesure', () => {
  const { doc, win } = load();
  openTab(doc, 'basse');
  const son = fauxSon(win);
  /* exercice 2 : six attaques par mesure, l'octave tient une noire */
  const b2 = doc.querySelector('#ar-2 .rythme-play');
  b2.click();
  assert.deepEqual(departs(son).slice(0, 6), [0, 1, 1.5, 2.5, 3, 3.5]);
  const notes2 = son.oscillateurs.filter(o => o.type === 'triangle');
  assert.equal(notes2.length, 4 * 6);
  assert.ok(Math.abs((notes2[2].fin - notes2[2].debut) - 1) < 1e-9, 'la note liée prolonge la précédente');
  /* lancer un autre exercice arrête le premier */
  son.oscillateurs.length = 0;
  const b3 = doc.querySelector('#ar-3 .rythme-play');
  b3.click();
  assert.equal(b2.getAttribute('aria-pressed'), 'false');
  assert.equal(b3.getAttribute('aria-pressed'), 'true');
  assert.equal(son.fermes, 1);
  /* exercice 3 : huit mesures avec les reprises, la basse en noire pointée */
  const t = departs(son);
  assert.equal(t.length, 8 * 6);
  assert.deepEqual(t.slice(0, 6), [0, 1.5, 2, 2.5, 3, 3.5]);
  const f = son.oscillateurs.filter(o => o.type === 'triangle').map(o => Math.round(o.frequency.value * 100) / 100);
  assert.deepEqual(f.slice(6, 12), f.slice(0, 6), 'la mesure « % » rejoue Gm');
  assert.notDeepEqual(f.slice(12, 18), f.slice(0, 6), 'puis on passe à F');
  assert.equal(son.oscillateurs.filter(o => o.type === 'square').length, 4 + 32);
  /* changer de tempo en cours de lecture repart au nouveau tempo */
  son.oscillateurs.length = 0;
  const tempo = doc.querySelector('#ar-3 .rythme-tempo');
  tempo.value = '100';
  tempo.dispatchEvent(new win.Event('change', { bubbles: true }));
  assert.equal(b3.getAttribute('aria-pressed'), 'true');
  const clics = son.oscillateurs.filter(o => o.type === 'square');
  assert.ok(Math.abs((clics[1].debut - clics[0].debut) - 0.6) < 1e-9, 'un temps dure 0,6 s à 100');
  /* changer d'onglet coupe le son */
  openTab(doc, 'theorie');
  assert.equal(b3.getAttribute('aria-pressed'), 'false');
  assert.equal(doc.querySelectorAll('#renversements .curseur').length, 0);
});

test('les lignes de partition se mettent à la largeur de la carte, toutes à la même échelle', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svgs = [...doc.querySelectorAll('#renversements-list .tab-scroll svg')];
  assert.equal(svgs.length, 4);
  const large = s => +s.getAttribute('viewBox').split(' ')[2];
  const ref = Math.max(...svgs.map(large));
  for (const s of svgs){
    assert.equal(s.hasAttribute('width'), false, 'plus de largeur fixe en pixels');
    assert.ok(Math.abs(parseFloat(s.style.width) - large(s) / ref * 100) < 0.01, 'largeur proportionnelle');
    assert.match(s.style.width, /%$/);
    assert.equal(s.style.height, 'auto');
  }
  /* la plus longue remplit la largeur */
  assert.ok(svgs.some(s => parseFloat(s.style.width) === 100));
});

test("improviser sur un seul accord : la piste du cours, la règle et la méthode", () => {
  const { doc, win } = load();
  openTab(doc, 'basse');
  const sec = doc.getElementById('impro-am');
  assert.equal(isVisible(sec), true);
  assert.match(sec.querySelector('.hint').textContent, /2 octobre 2026/);
  assert.match(sec.querySelector('.rule').textContent, /fondamentale tous les quatre temps/);
  assert.match(sec.querySelector('.rule').textContent, /grosse caisse/);
  const lien = doc.querySelector('#impro-am .track-card .play-link');
  assert.ok(lien, 'lien de la piste absent');
  assert.equal(isVisible(lien), true);
  assert.equal(lien.getAttribute('href'),
    'https://www.youtube.com/watch?v=wExXcKts-hE&list=PLFezkIXPVPrM&index=2');
  assert.equal(lien.target, '_blank');
  assert.equal(lien.rel, 'noopener');
  /* comme les autres pistes, elle s'ouvre dans la fenêtre dédiée */
  const appels = [];
  win.open = (url, nom) => { appels.push({ url, nom }); return { focus(){} }; };
  lien.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.deepEqual(appels, [{ url: lien.href, nom: 'piste-batterie' }]);
  /* la méthode convenue en cours : préparer sans la piste, puis poser dessus */
  const etapes = [...sec.querySelectorAll('.steps li')];
  assert.equal(etapes.length, 5);
  assert.match(etapes[0].textContent, /Sans la piste/);
  assert.match(etapes[0].textContent, /noires/);
  assert.match(etapes[2].textContent, /Lance la piste/);
  const retour = doc.getElementById('impro-am-retour');
  assert.equal(isVisible(retour), true);
  for (const bout of ['2 octobre 2026', "D'abord la mesure", 'On improvise avec ce qu\'on a travaillé',
                      'Les gammes sont les outils']){
    assert.ok(retour.textContent.includes(bout), 'manque : ' + bout);
  }
  /* aucun riff inventé : Santiago en a joué, mais rien n'a été noté */
  assert.equal(sec.querySelectorAll('svg').length, 0);
});

test('transposer : la fiche basse garde la consigne du cours et renvoie à l\'atelier de la théorie', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const bloc = doc.getElementById('penta-transposer');
  assert.equal(isVisible(bloc), true);
  assert.match(bloc.textContent, /2 octobre 2026/);
  assert.match(bloc.textContent, /revoir toutes les formes, et les transposer toutes/);
  for (const ton of ['Gm', 'Bm', 'Cm', 'Em', 'F♯m']) assert.ok(bloc.textContent.includes(ton), ton);
  /* la liste des cases a déménagé : elle est devenue l'atelier */
  assert.equal(doc.getElementById('transpo-list'), null);
  const lien = bloc.querySelector('a[data-goto="theorie"][data-anchor="transposer"]');
  assert.ok(lien, 'lien vers la théorie absent');
  lien.click();
  assert.equal(isVisible(doc.getElementById('transposer')), true);
  assert.equal(doc.getElementById('transposer').closest('.page').id, 'page-theorie');
});

test('les formes en Dm portent le retour du cours du 2 octobre 2026', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const retour = doc.getElementById('penta-dm');
  assert.equal(isVisible(retour), true);
  for (const bout of ['2 octobre 2026', 'Lis la tablature', 'Repère toujours la fondamentale']){
    assert.ok(retour.textContent.includes(bout), 'manque : ' + bout);
  }
});
