(function () {
  "use strict";

  var KEY = "mena-lullaby";
  var SYNODIC = 29.530588853;
  var NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);
  var DAY = 86400000;

  var PHASES = [
    { name: "New Moon", icon: "\uD83C\uDF11" },
    { name: "Waxing Crescent", icon: "\uD83C\uDF12" },
    { name: "First Quarter", icon: "\uD83C\uDF13" },
    { name: "Waxing Gibbous", icon: "\uD83C\uDF14" },
    { name: "Full Moon", icon: "\uD83C\uDF15" },
    { name: "Waning Gibbous", icon: "\uD83C\uDF16" },
    { name: "Last Quarter", icon: "\uD83C\uDF17" },
    { name: "Waning Crescent", icon: "\uD83C\uDF18" }
  ];

  var LINES = [
    "Sleep like the moon tonight — quiet, full, and watched over.",
    "Wherever you are, the same sky is closing its eyes with you.",
    "Let the day loosen its grip. It can wait until morning.",
    "You did enough today. More than enough. Now rest.",
    "The stars are on duty — you have nothing left to carry.",
    "Breathe in the dark; breathe out the noise. I'm here.",
    "Even the ocean pulls back at night. You can too.",
    "Soft dreams, my favourite person. The night is yours.",
    "One more sunrise and I'm still on your side of the sky.",
    "Put down the day. Pick up a dream where I'm next to you.",
    "The moon says goodnight in a language only we speak.",
    "Close your eyes. I'll count the stars, you count the sheep.",
    "Nothing is urgent now except sleep. Everything else can wait.",
    "You are home in my thoughts, all night, every night.",
    "Rest your head. The morning will bring me closer to you."
  ];

  var els = {};

  function $(id) {
    return els[id] || (els[id] = document.getElementById(id));
  }

  function todayISO(ms) {
    var d = new Date(ms);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function dayOfYear(ms) {
    var d = new Date(ms);
    var start = new Date(d.getFullYear(), 0, 0);
    return Math.floor((d - start) / DAY);
  }

  function phaseFraction(ms) {
    var days = (ms - NEW_MOON) / DAY;
    var frac = ((days % SYNODIC) + SYNODIC) % SYNODIC / SYNODIC;
    return frac;
  }

  function phaseInfo(ms) {
    var frac = phaseFraction(ms);
    var idx = Math.round(frac * 8) % 8;
    var illum = Math.round((1 - Math.cos(2 * Math.PI * frac)) / 2 * 100);
    return { phase: PHASES[idx], frac: frac, illum: illum };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { nights: [], line: null, last: null };
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return { nights: [], line: null, last: null };
      if (!Array.isArray(s.nights)) s.nights = [];
      return s;
    } catch (e) {
      return { nights: [], line: null, last: null };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function lastGoodnightText(iso) {
    if (!iso) return "never";
    var parts = iso.split("-");
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return parts[2].replace(/^0/, "") + " " + months[parseInt(parts[1], 10) - 1];
  }

  function computeStreak(nights, today) {
    var set = {};
    for (var i = 0; i < nights.length; i++) set[nights[i]] = true;
    if (!set[today]) return 0;
    var streak = 0;
    var cursor = Date.parse(today + "T00:00:00");
    while (set[todayISO(cursor)]) {
      streak++;
      cursor -= DAY;
    }
    return streak;
  }

  function renderMoon(ms) {
    var info = phaseInfo(ms);
    $("moon-icon").textContent = info.phase.icon;
    $("moon-name").textContent = info.phase.name;
    $("moon-note").textContent = "about " + info.illum + "% lit over Karachi and Bucharest tonight";
  }

  function renderStats(state) {
    var today = todayISO(Date.now());
    $("nights-count").textContent = String(state.nights.length);
    $("streak-count").textContent = String(computeStreak(state.nights, today));
    $("last-goodnight").textContent = lastGoodnightText(state.last);
  }

  function showLine(index) {
    $("lullaby-line").textContent = LINES[((index % LINES.length) + LINES.length) % LINES.length];
  }

  function say(msg) {
    $("note").textContent = msg;
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error("no clipboard"));
  }

  function init() {
    var state = load();
    var ms = Date.now();
    var today = todayISO(ms);

    renderMoon(ms);

    var seed = state.line;
    if (seed === null || seed === undefined) {
      seed = dayOfYear(ms) % LINES.length;
    }
    showLine(seed);

    renderStats(state);

    var params = new URLSearchParams(window.location.search);
    if (params.get("lullaby") === "1") {
      $("sent-note").hidden = false;
      $("sent-note").textContent = "\u2665 Ammar sent you a goodnight \u2014 sleep well, Mena.";
      $("moon-icon").classList.add("pulse");
    }

    $("another").addEventListener("click", function () {
      state.line = (state.line === null || state.line === undefined)
        ? (dayOfYear(ms) % LINES.length)
        : state.line;
      state.line = (state.line + 1) % LINES.length;
      showLine(state.line);
      save(state);
      say("Another line, just for tonight.");
    });

    $("goodnight").addEventListener("click", function () {
      if (state.nights.indexOf(today) === -1) {
        state.nights.push(today);
        state.last = today;
        save(state);
        renderStats(state);
        say("Goodnight saved \u2014 that's " + computeStreak(state.nights, today) + " in a row.");
      } else {
        say("Already saved for tonight. Sleep tight.");
      }
    });

    $("share").addEventListener("click", function () {
      var url = window.location.origin + window.location.pathname + "?lullaby=1";
      copyText(url).then(function () {
        say("Goodnight link copied \u2014 send it to him.");
      }).catch(function () {
        say("Copy this link to send a goodnight: " + url);
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
