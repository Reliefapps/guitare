'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ les gammes de La, section 2 de l'onglet théorie ============ */

/* les quatre grilles attendues : deux gammes × deux positions */
const POSITIONS = [
  { id:'gamme-mineur-ouverte', f0:0, suite:'A B C D E F G A B C D E F G A', ouvert:true,  cases:[0,5] },
  { id:'gamme-mineur-fermee',  f0:3, suite:'A B C D E F G A B C D E F G A', ouvert:false, cases:[4,8] },
  { id:'gamme-majeur-ouverte', f0:0, suite:'A B C♯ D E F♯ G♯ A B C♯ D E F♯ G♯ A', ouvert:true,  cases:[0,5] },
  { id:'gamme-majeur-fermee',  f0:3, suite:'A B C♯ D E F♯ G♯ A B C♯ D E F♯ G♯ A', ouvert:false, cases:[4,7] },
];

/* hauteur d'un nom de note, altérations comprises (CHROMA est plus bas) */
function hauteur(nom){
  return (CHROMA.indexOf(nom[0]) + (/[#♯]/.test(nom) ? 1 : 0)) % 12;
}
/* les six cordes de haut en bas, en demi-tons absolus : Mi aigu → Mi grave */
const CORDES = [64, 59, 55, 50, 45, 40];

/* relit une pastille du diagramme : sa corde (position verticale) et sa case
   (position horizontale, les cordes à vide étant à gauche du sillet) */
function lirePastille(g, f0){
  const c = g.querySelector('circle');
  const nut = f0 === 0 ? 70 : 44;
  const cx = +c.getAttribute('cx');
  return {
    nom: g.getAttribute('data-note'),
    corde: Math.round((+c.getAttribute('cy') - 24) / 34),
    case: cx < nut ? 0 : Math.round((cx - nut) / 62 + 0.5) + f0,
  };
}

test('les deux gammes de La sont rendues dans Théorie, chacune en deux positions', () => {
  const { doc } = load();
  const sec = doc.getElementById('gammes');
  assert.ok(sec, 'section #gammes absente');
  /* elles ont quitté la fiche guitare : masquées au chargement, visibles dans Théorie */
  assert.equal(sec.closest('.page').id, 'page-theorie');
  assert.equal(isVisible(sec), false);
  openTab(doc, 'theorie');
  assert.equal(isVisible(sec), true);
  assert.equal(sec.querySelector('.sec-num').textContent, '2');
  /* les blocs sont groupés par gamme, dans l'ordre mineure puis majeure */
  assert.deepEqual([...doc.querySelectorAll('#gamme-list > .family')].map(f => f.id),
    ['gamme-mineur', 'gamme-majeur']);
  assert.deepEqual([...doc.querySelectorAll('#gamme-list .tab-block')].map(b => b.id),
    POSITIONS.map(p => p.id));
  for (const pos of POSITIONS){
    const svg = doc.querySelector('#' + pos.id + ' .board-scroll svg');
    assert.ok(svg, pos.id + ' : pas de diagramme');
    /* 15 notes = deux octaves complètes, dans l'ordre de la gamme */
    const notes = [...svg.querySelectorAll('.gamme-note')].map(g => g.getAttribute('data-note'));
    assert.equal(notes.join(' '), pos.suite, pos.id + ' : la suite des notes est fausse');
  }
});

test('chaque pastille tombe bien sur la note qu\'elle annonce', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  for (const pos of POSITIONS){
    const pastilles = [...doc.querySelectorAll('#' + pos.id + ' .gamme-note')]
      .map(g => lirePastille(g, pos.f0));
    let precedente = -Infinity;
    for (const p of pastilles){
      const son = CORDES[p.corde] + p.case;
      assert.equal(son % 12, hauteur(p.nom),
        `${pos.id} : corde ${p.corde} case ${p.case} ne sonne pas ${p.nom}`);
      assert.ok(son > precedente,
        `${pos.id} : ${p.nom} ne monte pas par rapport à la note précédente`);
      precedente = son;
    }
    /* du A grave au A aigu : exactement deux octaves */
    const son = p => CORDES[p.corde] + p.case;
    assert.equal(son(pastilles[pastilles.length - 1]) - son(pastilles[0]), 24,
      pos.id + ' : la gamme ne couvre pas deux octaves');
  }
});

test('les positions ouvertes restent sous la case 5, les fermées n\'utilisent aucune corde à vide', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  for (const pos of POSITIONS){
    const cases = [...doc.querySelectorAll('#' + pos.id + ' .gamme-note')]
      .map(g => lirePastille(g, pos.f0).case);
    assert.equal(cases.includes(0), pos.ouvert,
      pos.id + ' : les cordes à vide ne sont pas au bon endroit');
    assert.deepEqual([Math.min(...cases), Math.max(...cases)], pos.cases,
      pos.id + ' : l\'étendue des cases est fausse');
  }
});

test('les gammes de La sont annoncées dans le sommaire de Théorie, plus dans celui de la guitare', () => {
  const { doc } = load();
  const txt = doc.getElementById('gammes').textContent;
  assert.match(txt, /A B C D E F G/);
  assert.match(txt, /A B C♯ D E F♯ G♯/);
  /* les exercices ont été retirés, le renvoi mène à la section 1 de la même page */
  assert.doesNotMatch(txt, /Deux octaves, aller-retour/);
  assert.ok(doc.querySelector('#gammes a[href="#construire"]'));
  assert.equal(doc.querySelector('#page-theorie nav.sticky a[href="#gammes"]').textContent, '2 · Les gammes de La');
  assert.equal(doc.querySelector('#page-guitare nav.sticky a[href="#gammes"]'), null);
  assert.equal(doc.querySelector('#sidenav-links a[href="#gammes"]'), null);
  for (const pos of POSITIONS){
    assert.equal(doc.querySelector('#sidenav-links a[href="#' + pos.id + '"]'), null,
      'lien latéral en trop : ' + pos.id);
  }
  /* la fiche guitare compte désormais sept sections, numérotées sans trou */
  assert.deepEqual([...doc.querySelectorAll('#page-guitare nav.sticky a')].map(a => a.getAttribute('href')),
    ['#manche', '#accords', '#barres', '#rythmiques', '#exercices', '#progressions', '#arpeges']);
  assert.deepEqual([...doc.querySelectorAll('#page-guitare .sec-num')].map(n => n.textContent),
    ['1', '2', '3', '4', '5', '6', '7']);
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

const CHROMA = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

/* ============ la construction des accords ============ */

test("l'onglet Théorie navigue désormais en six sections", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const liens = [...doc.querySelectorAll('#page-theorie nav.sticky a')];
  assert.deepEqual(liens.map(a => a.getAttribute('href')),
    ['#construire', '#gammes', '#triades', '#penta', '#boites', '#jeu']);
  liens.forEach(a => {
    const cible = doc.getElementById(a.getAttribute('href').slice(1));
    assert.ok(cible, a.getAttribute('href') + ' ne mène nulle part');
    assert.equal(isVisible(cible), true, a.getAttribute('href') + ' mène à une section masquée');
  });
  assert.deepEqual([...doc.querySelectorAll('#page-theorie .sec-num')].map(n => n.textContent),
    ['1', '2', '3', '4', '5', '6']);
});

test("un accord se construit en sautant une note sur deux dans la gamme", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const cartes = [...doc.querySelectorAll('#chord-rows .scale-row')];
  assert.deepEqual(cartes.map(c => c.id), ['chord-am', 'chord-c']);
  cartes.forEach(c => assert.equal(isVisible(c), true));

  /* chaque note de la gamme est soit prise, soit sautée, soit la septième */
  const lire = c => [...c.querySelectorAll('.chord-line .scale-note')].map(n =>
    n.textContent + (n.classList.contains('skip') ? '·saut'
                   : n.classList.contains('sept') ? '·7' : '·accord'));
  assert.deepEqual(lire(cartes[0]),
    ['A·accord', 'B·saut', 'C·accord', 'D·saut', 'E·accord', 'F·saut', 'G·7']);
  assert.deepEqual(lire(cartes[1]),
    ['C·accord', 'D·saut', 'E·accord', 'F·saut', 'G·accord', 'A·saut', 'B·7']);

  /* et l'accord obtenu est nommé sous la gamme, triade puis septième */
  const seqs = c => [...c.querySelectorAll('.chord-out .seq')].map(sq => [
    sq.querySelector('.seq-chord').textContent,
    [...sq.querySelectorAll('b')].map(b => b.textContent).join(''),
  ]);
  assert.deepEqual(seqs(cartes[0]), [['Am', 'ACE'], ['Am7', 'ACEG']]);
  assert.deepEqual(seqs(cartes[1]), [['C', 'CEG'], ['Cmaj7', 'CEGB']]);
  /* plus de jeu dans cette section : il est passé dans le jeu complet de la section 6 */
  assert.equal(doc.getElementById('acc-zone'), null);
  assert.equal(doc.getElementById('quiz-zone'), null);
});

test("la théorie renvoie à la piste Am / G de la fiche basse", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const lien = doc.querySelector('#triades a[data-goto="basse"]');
  assert.ok(lien, 'lien vers la fiche basse absent');
  lien.click();
  assert.equal(doc.getElementById('page-basse').hidden, false);
  assert.equal(doc.getElementById('page-theorie').hidden, true);
  assert.equal(isVisible(doc.getElementById('impro')), true);
});
