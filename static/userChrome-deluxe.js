(function () {
'use strict';

var AWAKE_MS = 16000;
var SLEEP_MS =  7000;

var POS_TOP  = PANTS_TOP_PX;
var POS_LEFT = PANTS_LEFT_PX;
var LOC      = 'PANTS_LOC';

var A = {
  cushion:   'url("PANTS_URI:Accessories/cushion_base.png")',
  pawBL:     'url("PANTS_URI:Limbs/left_back_paw.png")',
  pawFL:     'url("PANTS_URI:Limbs/left_front_paw.png")',
  body:      'url("PANTS_URI:Anim/breath.apng")',
  pawBR:     'url("PANTS_URI:Limbs/right_back_paw.png")',
  pawFR:     'url("PANTS_URI:Limbs/right_front_paw.png")',
  tail:      'url("PANTS_URI:Anim/tail-flick.apng")',
  headAwake: 'url("PANTS_URI:Anim/breath-head.apng")',
  headSleep: 'url("PANTS_URI:Anim/breath-head-sleep.apng")',
};

var CSS =
  ':root{--pants-w:364px;--pants-h:266px}' +
  '#pants{position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:9999;pointer-events:none}' +
  '#pants::before{content:\'\';position:absolute;top:0;left:0;' +
    'width:var(--pants-w);height:var(--pants-h);' +
    'background:var(--pants-scene,none) no-repeat top left/var(--pants-w) var(--pants-h)}' +
  '.pants-paw-bl,.pants-paw-fl,.pants-body,.pants-paw-br,.pants-paw-fr,.pants-tail,.pants-head,.pants-eyes' +
    '{position:absolute;top:0;left:0;width:0;height:0;overflow:visible}' +
  '.pants-paw-bl{z-index:1}.pants-paw-fl{z-index:2}.pants-body{z-index:3}' +
  '.pants-paw-br{z-index:4}.pants-paw-fr{z-index:5}.pants-tail{z-index:6}' +
  '.pants-head{z-index:7}.pants-eyes{z-index:8}' +
  '.pants-paw-bl::before,.pants-paw-fl::before,.pants-body::before,.pants-paw-br::before,' +
  '.pants-paw-fr::before,.pants-tail::before,.pants-head::before,.pants-eyes::before' +
    '{content:\'\';position:absolute;top:0;left:0;' +
    'width:var(--pants-w);height:var(--pants-h);' +
    'background:var(--pants-img,none) no-repeat top left/var(--pants-w) var(--pants-h)}';

var root, parts = {}, sleeping = false;

function boot() {
  if (document.getElementById('pants')) {
    root = document.getElementById('pants');
    ['paw-bl','paw-fl','body','paw-br','paw-fr','tail','head','eyes'].forEach(function (n) {
      parts[n] = root.querySelector('.pants-' + n);
    });
    return;
  }
  var s = document.createElement('style');
  s.textContent = CSS;
  document.documentElement.appendChild(s);

  root = document.createElement('div');
  root.id = 'pants';
  ['paw-bl','paw-fl','body','paw-br','paw-fr','tail','head','eyes'].forEach(function (n) {
    var el = document.createElement('div');
    el.className = 'pants-' + n;
    root.appendChild(el);
    parts[n] = el;
  });
  root.style.top  = POS_TOP  + 'px';
  root.style.left = POS_LEFT + 'px';
  document.documentElement.dataset.pantsLoc = LOC;
  document.documentElement.appendChild(root);
}

function img(el, url) { el.style.setProperty('--pants-img', url); }

function enterAwake() {
  img(parts['paw-bl'], A.pawBL);
  img(parts['paw-fl'], A.pawFL);
  img(parts['body'],   A.body);
  img(parts['paw-br'], A.pawBR);
  img(parts['paw-fr'], A.pawFR);
  img(parts['tail'],   A.tail);
  img(parts['head'],   A.headAwake);
  img(parts['eyes'],   'none');
}

function enterSleep() {
  img(parts['head'], A.headSleep);
  img(parts['eyes'], 'none');
}

function tick() {
  sleeping = !sleeping;
  sleeping ? enterSleep() : enterAwake();
  setTimeout(tick, sleeping ? SLEEP_MS : AWAKE_MS);
}

boot();
root.style.setProperty('--pants-scene', A.cushion);
enterAwake();
setTimeout(tick, AWAKE_MS);

}());
