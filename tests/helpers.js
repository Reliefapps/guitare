'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

/* Charge la page dans jsdom. IntersectionObserver n'existe pas dans jsdom :
   on en installe un faux avant l'exécution des scripts pour pouvoir déclencher
   le scrollspy à la main. */
function load(url){
  const observers = [];
  const jsErrors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    /* le parseur CSS de jsdom ne connaît pas color-mix() : ce n'est pas une
       erreur de la page, on ne retient que les vraies erreurs de script */
    if (/Could not parse CSS/i.test(e.message)) return;
    /* jsdom ne fait pas de layout : scrollTo n'y est pas implémenté, la page
       l'appelle déjà dans un try/catch */
    if (/Not implemented: window\.scroll/i.test(e.message)) return;
    jsErrors.push(e);
  });

  const dom = new JSDOM(HTML, {
    url: url || 'https://reliefapps.github.io/guitare/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win){
      win.IntersectionObserver = class {
        constructor(cb, opts){ this.cb = cb; this.opts = opts; this.targets = [];
          observers.push(this); }
        observe(t){ this.targets.push(t); }
        unobserve(){}
        disconnect(){}
        /* déclenche le callback comme si la section entrait dans le viewport */
        enter(target){ this.cb([{ isIntersecting:true, target }], this); }
      };
    },
  });
  return { dom, win: dom.window, doc: dom.window.document, observers, jsErrors };
}

/* Visible pour de vrai : ni l'élément ni aucun de ses parents n'est masqué.
   jsdom ne calcule pas de layout, donc offsetParent ne sert à rien ici — on
   remonte la chaîne des ancêtres. C'est exactement le cas qu'on avait raté :
   une section bien présente dans le DOM, mais dans un onglet `hidden`. */
function isVisible(el){
  if (!el) return false;
  const win = el.ownerDocument.defaultView;
  let n = el;
  while (n && n.nodeType === 1){
    if (n.hasAttribute('hidden')) return false;
    const cs = win.getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    n = n.parentElement;
  }
  return true;
}

/* Bascule sur un onglet en cliquant réellement dessus, comme un utilisateur. */
function openTab(doc, name){
  const tab = doc.querySelector(`.pagetab[data-page="${name}"]`);
  if (!tab) throw new Error('onglet introuvable : ' + name);
  tab.click();
  return tab;
}

module.exports = { load, isVisible, openTab };
