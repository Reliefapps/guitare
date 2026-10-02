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

/* les notes d'une tablature, relues depuis le SVG ; une note liée (écrite
   mais pas rejouée) est celle que la page estompe */
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
      liee: t.hasAttribute('opacity'),
    }))
    .sort((a, b) => a.x - b.x)
    .map(n => ({ ...n, hauteur: (CHROMA.indexOf(n.corde) + n.fret) % 12 }));
}

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
      assert.deepEqual(lireAccords(svgs[i]).filter(t => !/^×/.test(t)), ligne.accords, `${id} ligne ${i + 1} : accords`);
      assert.deepEqual(lireDoigts(svgs[i]), ligne.doigts, `${id} ligne ${i + 1} : doigtés différents de la feuille`);
      assert.equal(notes.filter(n => n.liee).length, ligne.liees, `${id} ligne ${i + 1} : notes liées`);
      assert.equal(svgs[i].querySelectorAll('path.liaison').length, ligne.liees, `${id} ligne ${i + 1} : arcs de liaison`);
      const reprises = [...svgs[i].querySelectorAll('text')].filter(t => t.textContent === '×2');
      assert.equal(reprises.length, ligne.reprises, `${id} ligne ${i + 1} : mesures à jouer deux fois`);
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
     l'écart entre la basse et la note suivante le montre */
  const pas = id => { const n = lireTablature(tabsDe(doc, id)[0]); return n[1].x - n[0].x; };
  assert.equal(pas('ar-1'), 50, 'exercice 1 : la basse est une noire');
  assert.equal(pas('ar-2'), 50, 'exercice 2 : la basse est une noire');
  assert.equal(pas('ar-3'), 75, 'exercice 3 : la basse est une noire pointée');
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
