'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

test('la routine affiche ses deux cartes et leurs liens internes', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const cartes = [...doc.querySelectorAll('#routine .routine-card')];
  assert.equal(cartes.length, 2);
  cartes.forEach(c => assert.equal(isVisible(c), true));
  const liens = [...doc.querySelectorAll('#routine .routine-link')].map(a => a.getAttribute('href'));
  assert.deepEqual(liens, ['#pluck-avance', '#notes-manche']);
  liens.forEach(h => assert.ok(doc.getElementById(h.slice(1)), h + ' ne mène nulle part'));
});

test("la main d'attaque liste la position et les 5 erreurs à éviter", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const position = doc.querySelectorAll('#main-attaque .routine-card .focus li');
  assert.equal(position.length, 10);
  const erreurs = doc.querySelectorAll('#main-attaque .warn ol li');
  assert.equal(erreurs.length, 5);
  assert.equal(isVisible(doc.querySelector('#main-attaque .warn')), true);
});

test('les 4 exercices avancés sont rendus et visibles', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const blocs = [...doc.querySelectorAll('#pluck-list .tab-block')];
  assert.equal(blocs.length, 4);
  assert.deepEqual(blocs.map(b => b.id), ['px-p1','px-p2','px-p3','px-p4']);
  blocs.forEach(b => assert.equal(isVisible(b), true, b.id + ' rendu mais pas visible'));
  /* l'exercice #2 est la priorité de la semaine */
  const prio = doc.querySelector('#pluck-list .tab-block.prio');
  assert.equal(prio.id, 'px-p2');
  assert.equal(prio.querySelectorAll('.prio-badge').length, 1);
  assert.equal(doc.querySelectorAll('#pluck-list .prio-badge').length, 1);
  /* la règle commune est bien mise en avant */
  assert.match(doc.querySelector('#pluck-avance .rule').textContent,
    /Ne jamais répéter le même doigt/);
});

test('les exercices 1 et 2 portent leurs tablatures, 3 et 4 leur emplacement à transcrire', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svg = id => [...doc.querySelectorAll('#' + id + ' .tab-scroll svg')];
  assert.equal(svg('px-p1').length, 1, 'exercice #1 : une mesure');
  assert.equal(svg('px-p2').length, 2, 'exercice #2 : quatre accords sur deux lignes');
  assert.equal(svg('px-p3').length, 0);
  assert.equal(svg('px-p4').length, 0);
  for (const id of ['px-p3','px-p4']){
    const slot = doc.querySelector('#' + id + ' .todo-slot');
    assert.ok(slot, id + ' : emplacement de tablature manquant');
    assert.match(slot.textContent, /02_PluckingHand\.pdf.*page 8/);
    assert.equal(isVisible(slot), true);
  }
});

test('les tablatures basse ont 4 lignes de cordes, G D A E de haut en bas', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  for (const s of doc.querySelectorAll('#pluck-list .tab-scroll svg')){
    const noms = [...s.querySelectorAll('text')]
      .filter(t => +t.getAttribute('x') === 14)
      .map(t => t.textContent);
    assert.deepEqual(noms, ['G','D','A','E']);
  }
});

test('exercice #1 : 12 croches, chaque note jouée deux fois, doigts 1 et 3', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const svg = doc.querySelector('#px-p1 .tab-scroll svg');
  /* les cases sont écrites en gras dans les pastilles ; 6 notes × 2 = 12 */
  const cases = [...svg.querySelectorAll('text')]
    .filter(t => t.getAttribute('text-anchor') === 'middle' && /^\d+$/.test(t.textContent));
  const suite = cases.map(t => t.textContent);
  /* 12 cases + la ligne de comptage 1..6 + les doigtés */
  assert.ok(suite.length >= 12);
  /* la mesure est à 6 temps : le comptage va de 1 à 6 */
  const comptage = [...svg.querySelectorAll('text')].filter(t => t.textContent === 'et');
  assert.equal(comptage.length, 6, '6 contretemps pour une mesure à 6/4');
  /* seuls les doigts 1 et 3 sont utilisés */
  const doigts = [...svg.querySelectorAll('text')]
    .filter(t => +t.getAttribute('font-size') === 10.5)
    .map(t => t.textContent);
  assert.equal(doigts.length, 12);
  assert.deepEqual([...new Set(doigts)].sort(), ['1','3']);
});

test('exercice #2 : les quatre accords Am G F E, chacun sur une mesure', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const accords = [...doc.querySelectorAll('#px-p2 .tab-scroll svg text')]
    .filter(t => +t.getAttribute('font-size') === 12.5 && /^[A-G](m)?$/.test(t.textContent)
                 && +t.getAttribute('y') < 30)
    .map(t => t.textContent);
  assert.deepEqual(accords, ['Am','G','F','E']);
  /* G et F ont la même forme, deux cases d'écart */
  const notes = doc.querySelector('#px-p2').textContent;
  assert.match(notes, /G et F ont la même forme/);
  assert.match(notes, /fondamentale · quinte · octave · tierce · octave · quinte/);
});

test('le manche de la basse a 4 cordes G D A E et 12 cases', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const fb = doc.getElementById('fretboard-basse');
  assert.equal(isVisible(fb), true, 'le manche est dans le DOM mais pas visible');
  const pastilles = fb.querySelectorAll('.note-g');
  assert.equal(pastilles.length, 4 * 13, '4 cordes × (case 0 à 12)');
  /* cordes à vide, de haut en bas */
  const vides = [...pastilles].slice(0, 13 * 4).filter((_, i) => i % 13 === 0)
    .map(g => g.getAttribute('data-note'));
  assert.deepEqual(vides, ['G','D','A','E']);
});

test('le mode quiz et les dièses fonctionnent sur le manche de la basse', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const fb = doc.getElementById('fretboard-basse');
  const diese = [...fb.querySelectorAll('.note-g')].find(g => g.getAttribute('data-sharp') === '1');
  assert.equal(diese.style.display, 'none', 'les dièses sont masqués par défaut');
  doc.getElementById('btn-sharps-basse').click();
  assert.equal(diese.style.display, '', 'les dièses doivent apparaître');

  const naturelle = [...fb.querySelectorAll('.note-g')].find(g => g.getAttribute('data-sharp') === '0');
  const cercle = naturelle.querySelector('circle');
  const couleur = cercle.getAttribute('fill');
  doc.getElementById('btn-quiz-basse').click();
  assert.equal(fb.classList.contains('quiz'), true);
  assert.notEqual(cercle.getAttribute('fill'), couleur, 'la note doit être masquée en mode quiz');
  naturelle.dispatchEvent(new doc.defaultView.MouseEvent('click'));
  assert.equal(cercle.getAttribute('fill'), couleur, 'un clic doit révéler la note');
});

test('le manche de la guitare est toujours rendu après extraction du composant', () => {
  const { doc } = load();
  const fb = doc.getElementById('fretboard');
  assert.equal(isVisible(fb), true);
  assert.equal(fb.querySelectorAll('.note-g').length, 6 * 13);
  doc.getElementById('btn-quiz').click();
  assert.equal(fb.classList.contains('quiz'), true);
});

test('la méthode des notes sur le manche compte ses 12 étapes', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const etapes = doc.querySelectorAll('#notes-manche .steps li');
  assert.equal(etapes.length, 12);
  assert.equal(isVisible(etapes[0]), true);
  assert.match(etapes[0].textContent, /C D E F G A B/);
  assert.match(etapes[9].textContent, /15 jours/);
});

test("les croches affichent l'état d'avancement et ce que Santiago a dit", () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const lignes = [...doc.querySelectorAll('#croches .status-table tbody tr')];
  assert.equal(lignes.length, 4);
  lignes.forEach(tr => assert.match(tr.querySelector('.ok').textContent, /validé/));
  assert.deepEqual(lignes.map(tr => tr.children[1].textContent.trim()), [
    'C – Bm – Em – D – G', 'Em – D – Am – B7', 'A – D – E – A', 'Dm – G – C – E',
  ]);
  const santiago = doc.querySelector('#croches .warn');
  assert.equal(isVisible(santiago), true);
  assert.equal(santiago.querySelectorAll('ol li').length, 3);
  assert.match(doc.querySelector('#croches .status-note').textContent, /échauffement/);
});

test('la suite du programme est listée en bas de page', () => {
  const { doc } = load();
  openTab(doc, 'basse');
  const road = doc.querySelector('#page-basse .roadmap');
  assert.equal(isVisible(road), true);
  assert.equal(road.querySelectorAll('.roadmap-chain span').length, 11);
  assert.equal(road.querySelectorAll('a').length, 0, 'la liste reste non cliquable');
  assert.match(road.textContent, /grosse caisse/);
});
