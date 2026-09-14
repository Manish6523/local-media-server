/* No dependency, Promise, smooth-scroll, CSS grid, or ES2015 requirement. */
(function (root) {
  'use strict';
  var current = null, scope = null, lastContent = null;
  function elements() {
    return Array.prototype.filter.call((scope || document).querySelectorAll('[data-focusable]'), function (el) {
      return !el.disabled && el.getClientRects().length && el.offsetWidth > 0 && el.offsetHeight > 0;
    });
  }
  function reveal(el) {
    var parent = el.parentNode, box, outer;
    while (parent && parent !== document.body) {
      box = el.getBoundingClientRect(); outer = parent.getBoundingClientRect();
      if (parent.scrollWidth > parent.clientWidth && parent.classList.contains('rail')) {
        if (box.left < outer.left + 14) { parent.scrollLeft -= outer.left + 14 - box.left; }
        if (box.right > outer.right - 14) { parent.scrollLeft += box.right - outer.right + 14; }
      }
      if (parent.classList.contains('scroller')) {
        if (box.top < outer.top + 16) { parent.scrollTop -= outer.top + 16 - box.top; }
        if (box.bottom > outer.bottom - 16) { parent.scrollTop += box.bottom - outer.bottom + 16; }
      }
      parent = parent.parentNode;
    }
  }
  function set(el) {
    if (!el) { return; }
    if (current) { current.classList.remove('focused'); }
    current = el; el.classList.add('focused');
    if (!el.hasAttribute('data-nav') && document.getElementById('app').contains(el)) { lastContent = el; }
    /* Native focus is reserved for editing so TV IME doesn't open on navigation. */
    if (document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== el) {
      document.activeElement.blur();
    }
    reveal(el);
  }
  function move(key) {
    var all = elements(), index = all.indexOf(current), row, same, next, r, cx, cy, best = null, score = Infinity;
    if (index < 0) { set(all[0]); return; }
    var nav = all.filter(function (el) { return el.hasAttribute('data-nav'); });
    if (current.hasAttribute('data-nav')) {
      if (key === 38 || key === 40) { set(nav[nav.indexOf(current) + (key === 38 ? -1 : 1)]); }
      if (key === 39) {
        set(all.indexOf(lastContent) >= 0 ? lastContent : all.filter(function (el) { return !el.hasAttribute('data-nav'); })[0]);
      }
      return;
    }
    row = current.getAttribute('data-row');
    if ((key === 37 || key === 39) && row) {
      same = all.filter(function (el) { return el.getAttribute('data-row') === row; });
      next = same.indexOf(current) + (key === 37 ? -1 : 1);
      if (next >= 0 && next < same.length) { set(same[next]); }
      else if (key === 37 && nav.length) { set(nav.filter(function (el) { return el.classList.contains('active'); })[0] || nav[0]); }
      return;
    }
    r = current.getBoundingClientRect(); cx = (r.left + r.right) / 2; cy = (r.top + r.bottom) / 2;
    all.forEach(function (el) {
      var b, dx, dy, primary, cross, value;
      if (el === current || ((key === 38 || key === 40) && (el.hasAttribute('data-nav') || (row && el.getAttribute('data-row') === row)))) { return; }
      b = el.getBoundingClientRect(); dx = (b.left + b.right) / 2 - cx; dy = (b.top + b.bottom) / 2 - cy;
      primary = key === 37 ? -dx : key === 39 ? dx : key === 38 ? -dy : dy;
      cross = key === 37 || key === 39 ? Math.abs(dy) : Math.abs(dx);
      if (primary <= 2) { return; }
      value = primary * primary + cross * cross * 2;
      if (value < score) { best = el; score = value; }
    });
    set(best);
  }
  root.TVFocus = {
    set: set, move: move, current: function () { return current; },
    scope: function (el, preferred) { scope = el; set(preferred && el.contains(preferred) ? preferred : elements()[0]); },
    click: function () { if (current && elements().indexOf(current) !== -1) { current.click(); } }
  };
  document.addEventListener('mouseover', function (event) {
    var el = event.target;
    while (el && el !== document.body) {
      if (el.hasAttribute('data-focusable') && (!scope || scope.contains(el))) { set(el); break; }
      el = el.parentNode;
    }
  });
}(window));
