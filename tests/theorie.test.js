'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ la gamme de La mineur, sur la fiche guitare ============ */

test('la gamme de La mineur est rendue en deux positions sur la fiche guitare', () => {
  const { doc } = load();
  const sec = doc.getElementById('gamme-am');
  assert.ok(sec, 'section #gamme-am absente');
  assert.equal(isVisible(sec), true);
  const blocs = [...doc.querySelectorAll('#gamme-list .tab-block')];
  assert.deepEqual(blocs.map(b => b.id), ['gamme-ouverte', 'gamme-fermee']);
  for (const b of blocs){
    const svg = b.querySelector('.board-scroll svg');
    assert.ok(svg, b.id + ' : pas de diagramme');
    /* 15 notes = deux octaves complètes, dans l'ordre de la gamme */
    const notes = [...svg.querySelectorAll('.gamme-note')].map(g => g.getAttribute('data-note'));
    assert.equal(notes.join(''), 'ABCDEFGABCDEFGA', b.id + ' : la suite des notes est fausse');
  }
});

test('la position ouverte reste sous la case 5, la fermée entre les cases 4 et 8', () => {
  const { doc } = load();
  /* on lit la case depuis le numéro affiché : les pastilles à gauche du sillet
     sont les cordes à vide, celles à droite tombent au milieu de leur case */
  function cases(svgSel, nutX, col){
    return [...doc.querySelectorAll(svgSel + ' .gamme-note circle')].map(c => {
      const cx = +c.getAttribute('cx');
      return cx < nutX ? 0 : Math.round((cx - nutX) / col + 0.5);
    });
  }
  const ouverte = cases('#gamme-ouverte svg', 70, 62);
  assert.ok(ouverte.includes(0), 'la position ouverte doit utiliser des cordes à vide');
  assert.ok(Math.max(...ouverte) <= 5, 'la position ouverte ne dépasse pas la case 5');
  /* position fermée : le bord gauche du diagramme est la frette 3 */
  const fermee = [...doc.querySelectorAll('#gamme-fermee svg .gamme-note circle')]
    .map(c => Math.round((+c.getAttribute('cx') - 44) / 62 + 0.5) + 3);
  assert.equal(Math.min(...fermee), 4, 'la position fermée commence case 4');
  assert.equal(Math.max(...fermee), 8, 'la position fermée finit case 8');
});

test('les deux exercices de la gamme sont décrits et navigables', () => {
  const { doc } = load();
  const txt = doc.getElementById('gamme-am').textContent;
  assert.match(txt, /Deux octaves, aller-retour/);
  assert.match(txt, /D'une octave à l'autre/);
  assert.match(txt, /A B C D E F G/);
  /* le sommaire collant et le menu latéral y mènent */
  assert.ok(doc.querySelector('#page-guitare nav.sticky a[href="#gamme-am"]'));
  assert.ok(doc.querySelector('#sidenav-links a[href="#gamme-am"]'));
  assert.ok(doc.querySelector('#sidenav-links a[href="#gamme-ouverte"]'));
  assert.ok(doc.querySelector('#sidenav-links a[href="#gamme-fermee"]'));
});

/* ============ l'onglet théorie ============ */

test("l'onglet Théorie s'ouvre et montre la construction des deux gammes", () => {
  const { doc, win } = load();
  openTab(doc, 'theorie');
  assert.equal(doc.getElementById('page-theorie').hidden, false);
  assert.equal(doc.getElementById('page-guitare').hidden, true);
  assert.equal(doc.title, 'Théorie · Mes fiches');

  const rows = [...doc.querySelectorAll('#scale-rows .scale-row')];
  assert.deepEqual(rows.map(r => r.id), ['scale-mineur', 'scale-majeur']);
  rows.forEach(r => assert.equal(isVisible(r), true));
  const notes = r => [...r.querySelectorAll('.scale-note')].map(n => n.textContent);
  const ints  = r => [...r.querySelectorAll('.scale-int')].map(n => n.textContent[0]);
  assert.deepEqual(notes(rows[0]), ['A','B','C','D','E','F','G','A']);
  assert.deepEqual(ints(rows[0]),  ['W','H','W','W','H','W','W']);
  assert.deepEqual(notes(rows[1]), ['A','B','C#','D','E','F#','G#','A']);
  assert.deepEqual(ints(rows[1]),  ['W','W','H','W','W','W','H']);
});

/* la même recette que celle codée dans la page, pour calculer la réponse attendue */
const FORMULES = { mineur:[2,1,2,2,1,2,2], majeur:[2,2,1,2,2,2,1] };
const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function gammeAttendue(root, type){
  const notes = [root];
  let idx = CHROMA.indexOf(root);
  for (const st of FORMULES[type]){ idx = (idx + st) % 12; notes.push(CHROMA[idx]); }
  return notes;
}

test('le jeu propose une fondamentale et un type, à compléter note par note', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');

  /* une gamme est proposée dès le chargement */
  assert.ok(['mineur','majeur'].includes(zone.dataset.type));
  assert.ok(zone.dataset.root, 'aucune fondamentale tirée au chargement');
  assert.match(doc.getElementById('quiz-prompt').textContent, new RegExp(zone.dataset.root));
  /* la fondamentale est donnée, affichée en 1ère case ; les 6 autres sont vides */
  const slots = () => [...doc.querySelectorAll('#quiz-slots .quiz-slot')];
  assert.equal(slots().length, 7);
  assert.equal(slots()[0].textContent, zone.dataset.root);
  assert.ok(slots()[0].classList.contains('given'));
  assert.equal(slots().slice(1).every(s => s.textContent === ''), true);
});

test('remplir les 6 notes justes valide la gamme et compte le point', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');
  const feedback = doc.getElementById('quiz-feedback');
  const attendu = gammeAttendue(zone.dataset.root, zone.dataset.type);

  for (const note of attendu.slice(1, 7)){
    doc.querySelector(`#quiz-palette [data-note="${note}"]`).click();
  }
  assert.match(feedback.textContent, /✓/);
  assert.equal(doc.getElementById('quiz-score').textContent, '1 / 1');
  /* une fois validé, la palette et l'effacement se bloquent */
  assert.equal(doc.querySelector('#quiz-palette button').disabled, true);
  assert.equal(doc.getElementById('quiz-undo').disabled, true);
  /* les 6 cases complétées sont marquées justes */
  const remplies = [...doc.querySelectorAll('#quiz-slots .quiz-slot.filled')];
  assert.equal(remplies.length, 6);
  remplies.forEach(s => assert.ok(s.classList.contains('correct')));
});

test('une note fausse est signalée, effacer permet de corriger', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');
  const attendu = gammeAttendue(zone.dataset.root, zone.dataset.type);
  const fausse = CHROMA.find(n => n !== attendu[1]);

  doc.querySelector(`#quiz-palette [data-note="${fausse}"]`).click();
  /* effacer retire la dernière note posée, la case redevient vide */
  doc.getElementById('quiz-undo').click();
  assert.equal(doc.querySelectorAll('#quiz-slots .quiz-slot.filled').length, 0);

  /* on complète la gamme avec une erreur volontaire au 1er degré libre */
  doc.querySelector(`#quiz-palette [data-note="${fausse}"]`).click();
  for (const note of attendu.slice(2, 7)){
    doc.querySelector(`#quiz-palette [data-note="${note}"]`).click();
  }
  const feedback = doc.getElementById('quiz-feedback');
  assert.match(feedback.textContent, /✗/);
  assert.match(feedback.textContent, /5 \/ 6/);
  const remplies = [...doc.querySelectorAll('#quiz-slots .quiz-slot.filled')];
  assert.equal(remplies[0].classList.contains('wrong'), true);
  assert.equal(remplies.slice(1).every(s => s.classList.contains('correct')), true);
});

test('une nouvelle gamme réinitialise les cases et garde le score', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');
  const attendu = gammeAttendue(zone.dataset.root, zone.dataset.type);
  for (const note of attendu.slice(1, 7)){
    doc.querySelector(`#quiz-palette [data-note="${note}"]`).click();
  }
  assert.equal(doc.getElementById('quiz-score').textContent, '1 / 1');

  doc.getElementById('quiz-new').click();
  assert.equal(doc.getElementById('quiz-feedback').textContent, '');
  assert.equal(doc.querySelectorAll('#quiz-slots .quiz-slot.filled').length, 0);
  assert.equal(doc.querySelector('#quiz-palette button').disabled, false);
  /* le score de la manche précédente reste affiché */
  assert.equal(doc.getElementById('quiz-score').textContent, '1 / 1');
});

test('les liens croisés gamme ↔ théorie changent de page sans recharger', () => {
  const { doc } = load();
  const versTheorie = doc.querySelector('#gamme-am a[data-goto="theorie"]');
  assert.ok(versTheorie, 'lien vers la théorie absent de la section gamme');
  versTheorie.click();
  assert.equal(doc.getElementById('page-theorie').hidden, false);
  assert.equal(doc.getElementById('page-guitare').hidden, true);
  const versGuitare = doc.querySelector('#page-theorie a[data-goto="guitare"]');
  assert.ok(versGuitare, 'lien retour vers la fiche guitare absent');
  versGuitare.click();
  assert.equal(doc.getElementById('page-guitare').hidden, false);
});
