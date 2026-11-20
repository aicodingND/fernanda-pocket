/* Behaviour every direction shares: language, data fill, open-now from the clock, hours table, keys, reveal.
   It computes and fills; it never lays out. Load after data.js as a classic script. */
(function () {
  var D = window.__DATA__ || {};
  var T = Object.assign({}, D.t || {}, window.__T__ || {});
  var LS = 'fh-lang';
  var html = document.documentElement;
  html.classList.add('js');
  var lang = 'en';
  try { lang = localStorage.getItem(LS) || 'en'; } catch (e) {}
  if (lang !== 'es') lang = 'en';

  function get(o, p) { return p.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function minutes(s) { var a = s.split(':'); return (+a[0]) * 60 + (+a[1]); }
  function fmt(s, l) {
    var a = s.split(':'), h = +a[0], m = +a[1];
    if (l === 'es') return h + ':' + (m < 10 ? '0' : '') + m;
    var ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return m ? h + ':' + (m < 10 ? '0' : '') + m + ' ' + ap : h + ' ' + ap;
  }
  var NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function openStatus(now) {
    var wk = get(D, 'salon.hours.week'); if (!wk) return null;
    var cur = now.getHours() * 60 + now.getMinutes(), i, d;
    var today = null; for (i = 0; i < wk.length; i++) if (wk[i].d === NAMES[now.getDay()]) today = wk[i];
    if (today && today.open && cur >= minutes(today.open) && cur < minutes(today.close)) return { open: true, until: today.close };
    for (i = 0; i < 7; i++) {
      d = null; for (var j = 0; j < wk.length; j++) if (wk[j].d === NAMES[(now.getDay() + i) % 7]) d = wk[j];
      if (!d || !d.open) continue;
      if (i === 0 && cur >= minutes(d.open)) continue;
      return { open: false, next: d, inDays: i };
    }
    return { open: false };
  }
  function openNow() {
    var els = document.querySelectorAll('[data-open-now]'); if (!els.length) return;
    var s = openStatus(new Date()), es = lang === 'es', txt = '';
    if (!s) txt = '';
    else if (s.open) txt = es ? 'Abierto ahora, hasta las ' + fmt(s.until, 'es') : 'Open now until ' + fmt(s.until, 'en');
    else if (s.next) {
      var at = fmt(s.next.open, lang);
      if (s.inDays === 0) txt = es ? 'Cerrado ahora. Abre hoy a las ' + at : 'Closed now. Opens today at ' + at;
      else if (s.inDays === 1) txt = es ? 'Cerrado ahora. Abre mañana a las ' + at : 'Closed now. Opens tomorrow at ' + at;
      else txt = es ? 'Cerrado ahora. Abre el ' + s.next.es.toLowerCase() + ' a las ' + at : 'Closed now. Opens ' + s.next.en + ' at ' + at;
    } else txt = es ? 'Horario por confirmar' : 'Hours to be confirmed';
    for (var i = 0; i < els.length; i++) { els[i].textContent = txt; els[i].dataset.open = s && s.open ? 'yes' : 'no'; }
  }
  function hoursTable() {
    var wk = get(D, 'salon.hours.week') || [];
    var els = document.querySelectorAll('[data-hours]');
    for (var i = 0; i < els.length; i++) {
      var out = '';
      for (var j = 0; j < wk.length; j++) {
        var d = wk[j];
        var v = d.open ? fmt(d.open, lang) + (lang === 'es' ? ' a ' : ' to ') + fmt(d.close, lang) : (lang === 'es' ? 'Cerrado' : 'Closed');
        out += '<div class="hrow' + (NAMES[new Date().getDay()] === d.d ? ' today' : '') + '"><span class="hday">' + (lang === 'es' ? d.es : d.en) + '</span><span class="hval">' + v + '</span></div>';
      }
      els[i].innerHTML = out;
    }
  }
  function fillFrom() {
    var els = document.querySelectorAll('[data-from]');
    for (var i = 0; i < els.length; i++) {
      var key = els[i].dataset.from;
      var v = get(D, key.replace(/_(en|es)$/, '_' + lang));
      if (v == null) v = get(D, key);
      if (v == null) continue;
      if (els[i].dataset.fromAttr) els[i].setAttribute(els[i].dataset.fromAttr, v); else els[i].textContent = v;
    }
  }
  function applyLang(l) {
    lang = l === 'es' ? 'es' : 'en';
    html.lang = lang;
    var els = document.querySelectorAll('[data-t]'), i;
    for (i = 0; i < els.length; i++) {
      var s = T[els[i].dataset.t]; if (!s) continue;
      var v = s[lang] != null ? s[lang] : s.en; if (v == null) continue;
      if (els[i].dataset.tAttr) els[i].setAttribute(els[i].dataset.tAttr, v); else els[i].textContent = v;
    }
    els = document.querySelectorAll('[data-lang-toggle]');
    for (i = 0; i < els.length; i++) els[i].setAttribute('aria-pressed', String(els[i].dataset.langToggle === lang));
    els = document.querySelectorAll('[data-lang-only]');
    for (i = 0; i < els.length; i++) els[i].hidden = els[i].dataset.langOnly !== lang;
    try { localStorage.setItem(LS, lang); } catch (e) {}
    fillFrom(); openNow(); hoursTable();
    document.dispatchEvent(new CustomEvent('fh:lang', { detail: { lang: lang } }));
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (b) { e.preventDefault(); applyLang(b.dataset.langToggle); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
    if (e.key === 'b' || e.key === 'B') {
      var t = document.querySelector('#book a, #book button');
      if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    }
    if (e.key === 'e' || e.key === 'E') applyLang(lang === 'es' ? 'en' : 'es');
  });
  function ready() { html.classList.add('ready'); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready, ready); else ready();
  setTimeout(ready, 1200);
  window.FH = { data: D, lang: function () { return lang; }, setLang: applyLang, openStatus: openStatus, fmt: fmt };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { applyLang(lang); });
  else applyLang(lang);
})();
