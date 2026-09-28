'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, isVisible, openTab } = require('./helpers');

/* ============ le sommaire latéral de l'onglet théorie, comme ceux de la guitare et de la basse ============ */

const SECTIONS = ['construire', 'gammes', 'triades', 'penta', 'boites', 'jeu'];

test('le menu latéral de la théorie existe, dans sa page, et ne se mélange pas aux autres', () => {
  const { doc } = load();
  const nav = doc.getElementById('sidenav-links-theorie');
  assert.ok(nav, 'menu latéral absent');
  assert.equal(nav.closest('.page').id, 'page-theorie');
  assert.ok(nav.closest('aside.sidenav'), 'le menu n\'est pas dans un aside.sidenav');
  assert.equal(nav.closest('aside').querySelector('.sidenav-title').textContent, 'Sommaire');
  /* un menu par fiche, chacun dans sa page */
  assert.equal(doc.getElementById('sidenav-links').closest('.page').id, 'page-guitare');
  assert.equal(doc.getElementById('sidenav-links-basse').closest('.page').id, 'page-basse');
  for (const a of doc.querySelectorAll('#sidenav-links a, #sidenav-links-basse a')){
    assert.ok(!SECTIONS.includes(a.getAttribute('href').slice(1)), a.getAttribute('href') + ' dans le mauvais menu');
  }
});

test('le premier niveau suit le sommaire collant : mêmes sections, mêmes numéros, même ordre', () => {
  const { doc } = load();
  const lvl1 = [...doc.querySelectorAll('#sidenav-links-theorie a.lvl1')];
  assert.deepEqual(lvl1.map(a => a.getAttribute('href')), SECTIONS.map(s => '#' + s));
  const sticky = [...doc.querySelectorAll('#page-theorie nav.sticky a')];
  assert.deepEqual(lvl1.map(a => a.getAttribute('href')), sticky.map(a => a.getAttribute('href')));
  assert.deepEqual(lvl1.map(a => a.textContent), sticky.map(a => a.textContent));
  /* le numéro du lien est celui de l'en-tête de section */
  lvl1.forEach((a, i) => {
    const sec = doc.getElementById(SECTIONS[i]);
    assert.equal(a.textContent.split(' · ')[0], sec.querySelector('.sec-num').textContent);
  });
});

test('le second niveau mène aux gammes, aux deux jeux de la pentatonique et aux trois boîtes', () => {
  const { doc } = load();
  const lvl2 = [...doc.querySelectorAll('#sidenav-links-theorie a.lvl2')].map(a => a.getAttribute('href'));
  assert.deepEqual(lvl2, [
    '#gamme-mineur-ouverte', '#gamme-mineur-fermee', '#gamme-majeur-ouverte', '#gamme-majeur-fermee',
    '#rel-zone', '#box-zone',
    '#boite-1', '#boite-4', '#boite-5', '#boites-technique',
  ]);
  /* chaque sous-entrée est rangée sous la bonne section */
  const liens = [...doc.querySelectorAll('#sidenav-links-theorie a')];
  let section = null;
  for (const a of liens){
    const id = a.getAttribute('href').slice(1);
    if (a.classList.contains('lvl1')){ section = id; continue; }
    assert.equal(doc.getElementById(id).closest('section').id, section, id + ' n\'est pas sous ' + section);
  }
  /* les boîtes portent leur titre et leurs cases */
  const boites = [...doc.querySelectorAll('#sidenav-links-theorie a.lvl2[href^="#boite-"]')].map(a => a.textContent);
  assert.deepEqual(boites, ['Boîte 1 · cases 5 à 8', 'Boîte 4 · cases 0 à 3', 'Boîte 5 · cases 2 à 5']);
});

test('chaque lien du menu mène à un élément visible une fois l\'onglet ouvert', () => {
  const { doc } = load();
  const liens = [...doc.querySelectorAll('#sidenav-links-theorie a')];
  assert.ok(liens.length >= 16);
  for (const a of liens){
    const cible = doc.getElementById(a.getAttribute('href').slice(1));
    assert.ok(cible, `l'ancre ${a.getAttribute('href')} ne mène nulle part`);
    assert.equal(isVisible(cible), false, `${a.getAttribute('href')} visible avant d'ouvrir l'onglet`);
  }
  openTab(doc, 'theorie');
  for (const a of liens){
    const cible = doc.getElementById(a.getAttribute('href').slice(1));
    assert.equal(isVisible(cible), true, `l'ancre ${a.getAttribute('href')} mène à un élément masqué`);
    assert.ok(a.textContent.trim().length > 0);
  }
});

test('le scrollspy de la théorie marque la bonne section, et ne touche pas aux autres menus', () => {
  const { doc, observers, jsErrors } = load();
  openTab(doc, 'theorie');
  const spy = observers.find(o => o.targets.some(t => t.id === 'construire'));
  assert.ok(spy, 'aucun observateur ne surveille la théorie');
  assert.deepEqual(spy.targets.map(t => t.id), SECTIONS);
  for (const id of SECTIONS){
    spy.enter(doc.getElementById(id));
    const actifs = [...doc.querySelectorAll('#sidenav-links-theorie a.active')];
    assert.equal(actifs.length, 1, `une seule section active attendue pour #${id}`);
    assert.equal(actifs[0].getAttribute('href'), '#' + id);
    assert.equal(doc.querySelectorAll('#sidenav-links a.active, #sidenav-links-basse a.active').length, 0);
  }
  assert.deepEqual(jsErrors, []);
});
