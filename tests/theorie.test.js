'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ les gammes de La, sur la fiche guitare ============ */

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

test('les deux gammes de La sont rendues, chacune en deux positions', () => {
  const { doc } = load();
  const sec = doc.getElementById('gammes');
  assert.ok(sec, 'section #gammes absente');
  assert.equal(isVisible(sec), true);
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
  for (const pos of POSITIONS){
    const cases = [...doc.querySelectorAll('#' + pos.id + ' .gamme-note')]
      .map(g => lirePastille(g, pos.f0).case);
    assert.equal(cases.includes(0), pos.ouvert,
      pos.id + ' : les cordes à vide ne sont pas au bon endroit');
    assert.deepEqual([Math.min(...cases), Math.max(...cases)], pos.cases,
      pos.id + ' : l\'étendue des cases est fausse');
  }
});

test('les exercices des gammes sont décrits et navigables', () => {
  const { doc } = load();
  const txt = doc.getElementById('gammes').textContent;
  assert.match(txt, /Deux octaves, aller-retour/);
  assert.match(txt, /D'une octave à l'autre/);
  assert.match(txt, /Mineure puis majeure/);
  assert.match(txt, /A B C D E F G/);
  assert.match(txt, /A B C♯ D E F♯ G♯/);
  /* le sommaire collant et le menu latéral y mènent */
  assert.ok(doc.querySelector('#page-guitare nav.sticky a[href="#gammes"]'));
  assert.ok(doc.querySelector('#sidenav-links a[href="#gammes"]'));
  for (const pos of POSITIONS){
    assert.ok(doc.querySelector('#sidenav-links a[href="#' + pos.id + '"]'),
      'lien latéral manquant : ' + pos.id);
  }
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

test('on peut choisir la fondamentale et le type au lieu du hasard', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');
  const root = doc.getElementById('quiz-root');
  const type = doc.getElementById('quiz-type');
  const fire = el => el.dispatchEvent(new doc.defaultView.Event('change', { bubbles:true }));

  /* au départ, les deux sélecteurs sont sur « au hasard » */
  assert.equal(root.value, '');
  assert.equal(type.value, '');

  /* E mineur : la gamme change tout de suite, sans toucher au score */
  type.value = 'mineur'; fire(type);
  root.value = 'E'; fire(root);
  assert.equal(zone.dataset.root, 'E');
  assert.equal(zone.dataset.type, 'mineur');
  assert.match(doc.getElementById('quiz-prompt').textContent, /E mineur/);
  assert.equal(doc.getElementById('quiz-slots').firstChild.textContent, 'E');
  assert.equal(doc.getElementById('quiz-score').textContent, '');

  /* le choix tient d'une manche à l'autre */
  doc.getElementById('quiz-new').click();
  assert.equal(zone.dataset.root, 'E');
  assert.equal(zone.dataset.type, 'mineur');

  /* A majeur, en changeant le type d'abord : E existe aussi en majeur, il reste */
  type.value = 'majeur'; fire(type);
  assert.equal(root.value, 'E');
  assert.equal(zone.dataset.type, 'majeur');
  root.value = 'A'; fire(root);
  assert.equal(zone.dataset.root, 'A');
  assert.match(doc.getElementById('quiz-prompt').textContent, /A majeur/);
  const attendu = gammeAttendue('A', 'majeur');
  for (const note of attendu.slice(1, 7)){
    doc.querySelector(`#quiz-palette [data-note="${note}"]`).click();
  }
  assert.match(doc.getElementById('quiz-feedback').textContent, /✓/);
});

test('la liste des fondamentales suit le type : jamais de gamme à bémols', () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('quiz-zone');
  const root = doc.getElementById('quiz-root');
  const type = doc.getElementById('quiz-type');
  const fire = el => el.dispatchEvent(new doc.defaultView.Event('change', { bubbles:true }));
  const options = () => [...root.options].map(o => o.value).filter(Boolean);

  /* au hasard : l'union des fondamentales des deux types, dans l'ordre chromatique */
  assert.deepEqual(options(), ['C','C#','D','E','F#','G','A','B']);
  type.value = 'mineur'; fire(type);
  assert.deepEqual(options(), ['A','E','B','F#','C#']);
  type.value = 'majeur'; fire(type);
  assert.deepEqual(options(), ['C','G','D','A','E','B']);

  /* C# n'existe qu'en mineur : le choisir avec le type au hasard impose le mineur */
  type.value = ''; fire(type);
  root.value = 'C#'; fire(root);
  for (let i = 0; i < 5; i++){
    doc.getElementById('quiz-new').click();
    assert.equal(zone.dataset.root, 'C#');
    assert.equal(zone.dataset.type, 'mineur');
  }
  /* revenir en majeur fait sauter C#, qui n'y est pas : retour au hasard */
  type.value = 'majeur'; fire(type);
  assert.equal(root.value, '');
  assert.ok(['C','G','D','A','E','B'].includes(zone.dataset.root));
  assert.equal(zone.dataset.type, 'majeur');
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
  const versTheorie = doc.querySelector('#gammes a[data-goto="theorie"]');
  assert.ok(versTheorie, 'lien vers la théorie absent de la section gamme');
  versTheorie.click();
  assert.equal(doc.getElementById('page-theorie').hidden, false);
  assert.equal(doc.getElementById('page-guitare').hidden, true);
  const versGuitare = doc.querySelector('#page-theorie a[data-goto="guitare"]');
  assert.ok(versGuitare, 'lien retour vers la fiche guitare absent');
  versGuitare.click();
  assert.equal(doc.getElementById('page-guitare').hidden, false);
});

/* ============ la construction des accords ============ */

test("l'onglet Théorie navigue désormais en quatre sections", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const liens = [...doc.querySelectorAll('#page-theorie nav.sticky a')];
  assert.deepEqual(liens.map(a => a.getAttribute('href')),
    ['#construire', '#jeu', '#triades', '#penta']);
  liens.forEach(a => {
    const cible = doc.getElementById(a.getAttribute('href').slice(1));
    assert.ok(cible, a.getAttribute('href') + ' ne mène nulle part');
    assert.equal(isVisible(cible), true, a.getAttribute('href') + ' mène à une section masquée');
  });
  assert.deepEqual([...doc.querySelectorAll('#page-theorie .sec-num')].map(n => n.textContent),
    ['1', '2', '3', '4']);
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

/* les notes de l'accord : une sur deux dans la gamme, degrés 1 · 3 · 5 (· 7) */
function accordAttendu(root, type, sept){
  const g = gammeAttendue(root, type);
  return sept ? [g[0], g[2], g[4], g[6]] : [g[0], g[2], g[4]];
}
function nomAttendu(root, type, sept){
  if (type === 'mineur') return root + (sept ? 'm7' : 'm');
  return root + (sept ? 'maj7' : '');
}

test("le jeu d'accords suit les exemples, fondamentale donnée", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('acc-zone');
  assert.equal(isVisible(zone), true);
  /* il vit dans la section « Construire un accord », après les exemples A et C */
  assert.equal(zone.closest('section').id, 'triades');
  const ordre = [...zone.parentElement.children].map(n => n.id).filter(Boolean);
  assert.ok(ordre.indexOf('chord-rows') < ordre.indexOf('acc-zone'),
    'le jeu doit venir après les exemples');

  assert.ok(['mineur', 'majeur'].includes(zone.dataset.type));
  assert.ok(zone.dataset.root, 'aucune fondamentale tirée au chargement');
  assert.ok(['0', '1'].includes(zone.dataset.sept));
  const enonce = doc.getElementById('acc-prompt').textContent;
  assert.match(enonce, new RegExp(zone.dataset.root));
  assert.match(enonce, zone.dataset.sept === '1' ? /septième/ : /triade/);

  /* la fondamentale est donnée : reste 2 notes pour une triade, 3 avec la septième */
  const slots = [...doc.querySelectorAll('#acc-slots .quiz-slot')];
  assert.equal(slots.length, zone.dataset.sept === '1' ? 4 : 3);
  assert.equal(slots[0].textContent, zone.dataset.root);
  assert.ok(slots[0].classList.contains('given'));
  assert.equal(slots.slice(1).every(s => s.textContent === ''), true);
});

test("un accord complété juste compte le point et se voit nommé", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('acc-zone');
  const sept = zone.dataset.sept === '1';
  const attendu = accordAttendu(zone.dataset.root, zone.dataset.type, sept);

  for (const note of attendu.slice(1)){
    doc.querySelector(`#acc-palette [data-note="${note}"]`).click();
  }
  const feedback = doc.getElementById('acc-feedback');
  assert.match(feedback.textContent, /✓/);
  assert.match(feedback.textContent, new RegExp(
    nomAttendu(zone.dataset.root, zone.dataset.type, sept) + ", c'est " + attendu.join(' · ')));
  assert.equal(doc.getElementById('acc-score').textContent, '1 / 1');
  /* une fois validé, la palette et l'effacement se bloquent */
  assert.equal(doc.querySelector('#acc-palette button').disabled, true);
  assert.equal(doc.getElementById('acc-undo').disabled, true);
  const remplies = [...doc.querySelectorAll('#acc-slots .quiz-slot.filled')];
  assert.equal(remplies.length, attendu.length - 1);
  remplies.forEach(s => assert.ok(s.classList.contains('correct')));
});

test("une note fausse dans l'accord est signalée, effacer permet de corriger", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('acc-zone');
  const attendu = accordAttendu(zone.dataset.root, zone.dataset.type, zone.dataset.sept === '1');
  const fausse = CHROMA.find(n => n !== attendu[1]);

  doc.querySelector(`#acc-palette [data-note="${fausse}"]`).click();
  doc.getElementById('acc-undo').click();
  assert.equal(doc.querySelectorAll('#acc-slots .quiz-slot.filled').length, 0);

  /* on complète avec une erreur volontaire sur la première note libre */
  doc.querySelector(`#acc-palette [data-note="${fausse}"]`).click();
  for (const note of attendu.slice(2)){
    doc.querySelector(`#acc-palette [data-note="${note}"]`).click();
  }
  const feedback = doc.getElementById('acc-feedback');
  assert.match(feedback.textContent, /✗/);
  assert.match(feedback.textContent,
    new RegExp((attendu.length - 2) + ' / ' + (attendu.length - 1)));
  const remplies = [...doc.querySelectorAll('#acc-slots .quiz-slot.filled')];
  assert.equal(remplies[0].classList.contains('wrong'), true);
  assert.equal(remplies.slice(1).every(s => s.classList.contains('correct')), true);
});

test("un nouvel accord réinitialise les cases et garde le score", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  const zone = doc.getElementById('acc-zone');
  const attendu = accordAttendu(zone.dataset.root, zone.dataset.type, zone.dataset.sept === '1');
  for (const note of attendu.slice(1)){
    doc.querySelector(`#acc-palette [data-note="${note}"]`).click();
  }
  assert.equal(doc.getElementById('acc-score').textContent, '1 / 1');

  doc.getElementById('acc-new').click();
  assert.equal(doc.getElementById('acc-feedback').textContent, '');
  assert.equal(doc.querySelectorAll('#acc-slots .quiz-slot.filled').length, 0);
  assert.equal(doc.querySelector('#acc-palette button').disabled, false);
  assert.equal(doc.getElementById('acc-score').textContent, '1 / 1');
});

test("les deux jeux de la théorie sont indépendants", () => {
  const { doc } = load();
  openTab(doc, 'theorie');
  /* remplir l'un ne touche pas l'autre : palettes, cases et scores séparés */
  const gamme = gammeAttendue(doc.getElementById('quiz-zone').dataset.root,
                              doc.getElementById('quiz-zone').dataset.type);
  for (const note of gamme.slice(1, 7)){
    doc.querySelector(`#quiz-palette [data-note="${note}"]`).click();
  }
  assert.equal(doc.getElementById('quiz-score').textContent, '1 / 1');
  assert.equal(doc.getElementById('acc-score').textContent, '');
  assert.equal(doc.querySelectorAll('#acc-slots .quiz-slot.filled').length, 0);
  assert.equal(doc.querySelector('#acc-palette button').disabled, false);
});
