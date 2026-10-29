/* Projects · Jen
   A portfolio built from each project's own overview (<repo>/overview/overview.json),
   so nothing here is copied: edit an overview and this site follows. What's shown, in
   what order and what's featured is site.json.

   Pages (one HTML file, routed by the hash):
     ./                 home: intro, featured projects, every project with filters
     ./#recipe-book     a project, laid out from its overview
     ./#stats           views, for the signed-in owner only (not linked anywhere)

   The home page also has a timeline of when each project was built, from timeline.json
   (made from commit history by tools/timeline.mjs, which a workflow runs daily).

   Edit mode (from the stats page) signs in to GitHub and makes the text editable in
   place; Save commits the changes to site.json or that project's overview.json.

   Views are counted quietly, once per visit, in Firestore's showcase_visits (the code
   and the time, nothing else): "pf" for the home page, "pf-<tag>" when the link had
   ?for=<tag>, and "pp-<slug>" for a project page. Nothing is counted off the live site,
   or in a browser that has opened the stats page. */
(function () {
  "use strict";

  var DOCS = "https://firestore.googleapis.com/v1/projects/github-projects-5d4e4/databases/(default)/documents/";
  var API_KEY = "AIzaSyBeIyBs3FtSx9T_wlJHsCqkfxZkhbX3Qhk";
  var FIREBASE = {
    apiKey: API_KEY,
    authDomain: "github-projects-5d4e4.firebaseapp.com",
    projectId: "github-projects-5d4e4",
    storageBucket: "github-projects-5d4e4.firebasestorage.app",
    messagingSenderId: "745706177240",
    appId: "1:745706177240:web:8e3f1f92ceafb1fa444dad"
  };
  var LIVE = location.hostname === "jkw2lo.github.io";
  var ME = "projects:me"; // set once you've opened #stats here: this browser isn't counted

  var OWNER = "jkw2lo", SITE = "projects"; // this site's own repo, where site.json lives

  var main = document.getElementById("main");
  var site = null, timeline = null, all = [], bySlug = {}, byRepo = {}, groups = {}, filter = "all";

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var str = function (v, max) { return typeof v === "string" ? v.trim().slice(0, max || 600) : ""; };
  var list = function (v, max) { return Array.isArray(v) ? v.slice(0, max) : []; };
  function safeUrl(u, base) {
    try { var url = new URL(u, base); return /^https?:$/.test(url.protocol) ? url.href : ""; } catch (e) { return ""; }
  }
  function inkOn(hex) {
    var n = parseInt(hex.slice(1), 16);
    var rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] > 0.4 ? "#141414" : "#ffffff";
  }
  var slugify = function (s) { return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); };
  var svg = function (path) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + path + "</svg>"; };
  var ARROW = svg('<path d="M5 12h14M13 6l6 6-6 6"/>');
  var OUT = svg('<path d="M7 17L17 7M9 7h8v8"/>');
  var BACK = svg('<path d="M19 12H5M11 18l-6-6 6-6"/>');
  var vars = function (p) { return ' style="--accent:' + p.accent + ";--on-accent:" + p.ink + '"'; };
  function img(p, shot, cls) {
    var src = shot && safeUrl(str(shot.src, 300), p.base);
    if (!src) return "";
    return '<img src="' + esc(src) + '" alt="' + esc(str(shot.alt, 200)) + '"' + (cls === "eager" ? "" : ' loading="lazy"') + ">";
  }

  // ---------- quiet view counting ----------
  var tag = "";
  try { tag = (new URLSearchParams(location.search).get("for") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 16); } catch (e) {}
  function count(k) {
    if (!LIVE) return;
    try {
      if (localStorage.getItem(ME)) return;
      if (sessionStorage.getItem("projects:seen:" + k)) return;
      sessionStorage.setItem("projects:seen:" + k, "1");
    } catch (e) {}
    try {
      fetch(DOCS + "showcase_visits?key=" + API_KEY, {
        method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { k: { stringValue: k.slice(0, 24) }, at: { timestampValue: new Date().toISOString() } } })
      }).catch(function () {});
    } catch (e) {}
  }

  // ---------- loading ----------
  main.innerHTML = '<p class="loading wrap">Loading projects…</p>';
  var timelineReady = fetch("timeline.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; })
    .then(function (t) { timeline = t && t.projects ? t : null; }, function () {});
  fetch("site.json", { cache: "no-cache" }).then(function (r) { return r.json(); }).then(function (s) {
    site = s;
    (s.groups || []).forEach(function (g) { groups[g.id] = g.label; });
    if (s.name) {
      document.getElementById("brand").textContent = s.name;
      document.getElementById("footName").textContent = "© " + new Date().getFullYear() + " " + s.name;
    }
    if (s.github) document.getElementById("navGithub").href = s.github;
    return Promise.all((s.projects || []).map(function (entry) {
      var repo = String(entry.repo || "");
      if (!/^[A-Za-z0-9._-]+$/.test(repo)) return null;
      var base = new URL("../" + repo + "/overview/", location.href).href;
      return fetch(base + "overview.json", { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; }, function () { return null; })
        .then(function (d) {
          if (!d) return null;
          var accent = /^#[0-9a-f]{6}$/i.test(d.accent || "") ? d.accent : "#141414";
          var name = str(d.name, 60) || repo;
          return {
            repo: repo, d: d, base: base, name: name, slug: slugify(name), group: entry.group || "",
            accent: accent, ink: inkOn(accent), url: "https://jkw2lo.github.io/" + repo + "/"
          };
        });
    }));
  }).then(function (items) {
    return timelineReady.then(function () { return items; });
  }).then(function (items) {
    all = items.filter(Boolean);
    all.forEach(function (p) { bySlug[p.slug] = p; byRepo[p.repo] = p; });
    route();
    window.addEventListener("hashchange", route);
  }).catch(function () {
    main.innerHTML = '<p class="loading wrap">Something went wrong loading the projects. Try again in a moment.</p>';
  });

  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === "stats") return renderStats();
    if (bySlug[h]) renderProject(bySlug[h]);
    else renderHome(h);
    armEditor();
  }

  // ---------- home ----------
  var lastSlug = "";
  function renderHome(anchor) {
    document.title = (site.title || "Projects") + " · " + (site.name || "");
    var featured = list(site.featured, 4).map(function (r) { return all.filter(function (p) { return p.repo === r; })[0]; }).filter(Boolean);
    var used = {};
    all.forEach(function (p) { used[p.group] = (used[p.group] || 0) + 1; });
    var gs = (site.groups || []).filter(function (g) { return used[g.id]; });
    main.innerHTML =
      '<section class="hero wrap">' +
        "<h1" + ed(SITE, "headline") + ">" + esc(site.headline || "") + "</h1>" +
        (site.intro || editing ? "<p" + ed(SITE, "intro") + ">" + esc(site.intro || "") + "</p>" : "") +
        '<div class="hero-meta"><span><b>' + all.length + "</b> projects</span>" +
          (gs.length ? "<span>" + gs.map(function (g) { return esc(g.label); }).join(" · ") + "</span>" : "") +
          (site.github ? '<a href="' + esc(site.github) + '">Code on GitHub</a>' : "") + "</div>" +
      "</section>" +
      (featured.length ? '<section class="wrap" aria-labelledby="featuredTitle">' +
        '<div class="section-title"><h2 id="featuredTitle">Featured</h2></div>' +
        '<div class="featured">' + featured.map(featureRow).join("") + "</div></section>" : "") +
      '<section class="wrap" id="work" aria-labelledby="workTitle">' +
        '<div class="section-title"><h2 id="workTitle">All projects</h2></div>' +
        (gs.length > 1 ? '<ul class="filters" aria-label="Filter by area">' +
          [["all", "All", all.length]].concat(gs.map(function (g) { return [g.id, g.label, used[g.id]]; })).map(function (f) {
            return '<li><button type="button" data-filter="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + esc(f[1]) + '<span class="n">' + f[2] + "</span></button></li>";
          }).join("") + "</ul>" : "") +
        '<ul class="grid" id="grid"></ul>' +
      "</section>" + timelineSection();
    renderGrid();
    main.querySelector(".filters") && main.querySelector(".filters").addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b) return;
      filter = b.dataset.filter;
      main.querySelectorAll("[data-filter]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderGrid();
    });
    // back from a project: land where you were
    var back = lastSlug && main.querySelector('[data-slug="' + lastSlug + '"]');
    if (back) { back.scrollIntoView({ block: "center" }); lastSlug = ""; }
    else if (anchor === "work") document.getElementById("work").scrollIntoView();
    else window.scrollTo(0, 0);
    count(tag ? "pf-" + tag : "pf");
  }
  function featureRow(p) {
    var shot = list(p.d.screens, 1)[0];
    var points = list(p.d.features, 3).map(function (f, i) { return [str(f && f.title, 40), i]; }).filter(function (x) { return x[0]; });
    return '<a class="feature" href="#' + p.slug + '" data-slug="' + p.slug + '"' + vars(p) + ">" +
      '<div class="feature-shot' + (shot && shot.frame === "phone" ? " phone" : "") + '">' + img(p, shot) + "</div>" +
      '<div class="feature-text">' +
        '<span class="eyebrow"><i></i>' + esc(groups[p.group] || "") + "</span>" +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="tagline"' + ed(p.repo, "tagline") + ">" + esc(str(p.d.tagline, 60)) + "</p>" +
        '<p class="pitch"' + ed(p.repo, "pitch") + ">" + esc(str(p.d.pitch, 200)) + "</p>" +
        (points.length ? '<ul class="feature-points">' + points.map(function (x) {
          return "<li" + ed(p.repo, "features." + x[1] + ".title") + ">" + esc(x[0]) + "</li>";
        }).join("") + "</ul>" : "") +
        '<p class="feature-more"><span>See the project</span> →</p>' +
      "</div></a>";
  }
  function renderGrid() {
    var shown = all.filter(function (p) { return filter === "all" || p.group === filter; });
    document.getElementById("grid").innerHTML = shown.map(function (p) {
      var shot = list(p.d.screens, 1)[0];
      return '<li><a class="card" href="#' + p.slug + '" data-slug="' + p.slug + '"' + vars(p) + ">" +
        '<div class="card-shot' + (shot && shot.frame === "phone" ? " phone" : "") + '">' + img(p, shot) + "</div>" +
        '<div class="card-body"><span class="eyebrow"><i></i>' + esc(groups[p.group] || "") + "</span>" +
          "<h3>" + esc(p.name) + "</h3><p" + ed(p.repo, "tagline") + ">" + esc(str(p.d.tagline, 60)) + "</p></div></a></li>";
    }).join("");
  }

  // ---------- a project ----------
  function renderProject(p) {
    lastSlug = p.slug;
    var d = p.d, screens = list(d.screens, 3), i = all.indexOf(p);
    var prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
    document.title = p.name + " · " + (site.name || "");
    var f = d.facts || {};
    var facts = ["worksOn", "data", "builtWith"].map(function (k) { return [str(f[k], 40), ed(p.repo, "facts." + k)]; })
      .concat([[built(p) || (str(f.started) ? "Since " + str(f.started, 20) : ""), ""]]).filter(function (x) { return x[0]; });
    var problem = str(d.problem, 100) || (d.problem && str(d.problem.headline, 100)) || "";
    var problemPath = typeof d.problem === "string" ? "problem" : "problem.headline";
    var stats = list(d.stats, 3).map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s && str(x.s.value); });
    var features = list(d.features, 4).map(function (x, i) { return { x: x, at: "features." + i }; }).filter(function (o) { return o.x && str(o.x.title); });
    var details = function (o) {
      var items = list(o.x.details, 3).map(function (t, j) { return [str(t, 90), j]; }).filter(function (t) { return t[0]; });
      return items.length ? '<ul class="feature-points">' + items.map(function (t) {
        return "<li" + ed(p.repo, o.at + ".details." + t[1]) + ">" + esc(t[0]) + "</li>";
      }).join("") + "</ul>" : "";
    };
    var heading = function (o) {
      return "<h3" + ed(p.repo, o.at + ".title") + ">" + esc(str(o.x.title, 30)) + "</h3>" +
        (str(o.x.text) ? "<p" + ed(p.repo, o.at + ".text") + ">" + esc(str(o.x.text, 100)) + "</p>" : "") + details(o);
    };
    var html = '<div class="wrap"' + vars(p) + ">" +
      '<a class="back" href="./#work">' + BACK + "All projects</a>" +
      '<section class="p-hero"><div>' +
        '<span class="eyebrow"><i></i>' + esc(groups[p.group] || "") + (str(d.status, 30) ? " · " + esc(str(d.status, 30)) : "") + "</span>" +
        "<h1>" + esc(p.name) + "</h1>" +
        (str(d.tagline) ? '<p class="tagline"' + ed(p.repo, "tagline") + ">" + esc(str(d.tagline, 60)) + "</p>" : "") +
        (str(d.pitch) ? '<p class="pitch"' + ed(p.repo, "pitch") + ">" + esc(str(d.pitch, 200)) + "</p>" : "") +
        '<div class="p-actions"><a class="btn accent" href="' + esc(p.url) + '">Open the app ' + OUT + "</a>" +
          '<a class="btn" href="https://github.com/jkw2lo/' + esc(p.repo) + '">Source</a></div>' +
        (facts.length ? '<ul class="p-facts">' + facts.map(function (x) { return "<li" + x[1] + ">" + esc(x[0]) + "</li>"; }).join("") + "</ul>" : "") +
      "</div>" +
      (screens[0] ? '<div class="frame' + (screens[0].frame === "phone" ? " phone" : "") + '">' + img(p, screens[0], "eager") + "</div>" : "") +
      "</section>";
    if (problem || stats.length) {
      html += '<section class="band">' +
        (problem ? '<div><span class="eyebrow">Why it exists</span><h2' + ed(p.repo, problemPath) + ">" + esc(problem) + "</h2></div>" : "<div></div>") +
        (stats.length ? '<div class="band-stats">' + stats.map(function (o) {
          return "<div><b" + ed(p.repo, "stats." + o.i + ".value") + ">" + esc(str(o.s.value, 12)) + "</b>" +
            "<span" + ed(p.repo, "stats." + o.i + ".label") + ">" + esc(str(o.s.label, 50)) + "</span></div>";
        }).join("") + "</div>" : "") + "</section>";
    }
    if (features.length) {
      html += '<section class="p-features" aria-label="Key features">';
      var cards = [], rows = 0;
      var flush = function () {
        if (!cards.length) return;
        html += '<div class="p-cards">' + cards.map(function (o) { return "<div>" + heading(o) + "</div>"; }).join("") + "</div>";
        cards = [];
      };
      features.forEach(function (o) {
        var shot = o.x.screen && img(p, o.x.screen);
        if (!shot) { cards.push(o); return; }
        flush();
        html += '<div class="p-feature' + (rows++ % 2 ? " flip" : "") + '"><div>' + heading(o) + "</div>" +
          '<div class="shot frame' + (o.x.screen.frame === "phone" ? " phone" : "") + '">' + shot + "</div></div>";
      });
      flush();
      html += "</section>";
    }
    if (screens.length > 1) {
      html += '<section class="p-features"><div class="p-cards" style="border:0;padding:0">' + screens.slice(1).map(function (s) {
        return '<div class="frame' + (s.frame === "phone" ? " phone" : "") + '" style="padding:0">' + img(p, s) + "</div>";
      }).join("") + "</div></section>";
    }
    if (all.length > 1) {
      html += '<nav class="pn" aria-label="More projects">' +
        '<a class="prev" href="#' + prev.slug + '"><small>← Previous</small><b>' + esc(prev.name) + "</b></a>" +
        '<a class="next" href="#' + next.slug + '"><small>Next →</small><b>' + esc(next.name) + "</b></a></nav>";
    }
    main.innerHTML = html + "</div>";
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
    count("pp-" + p.slug);
  }

  // ---------- timeline ----------
  var MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var utc = function (s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
  var monthOf = function (s) { return MON[+s.slice(5, 7) - 1]; };
  var dayOf = function (s) { return monthOf(s) + " " + +s.slice(8, 10); };
  function span(a, b) {
    if (a === b) return dayOf(a);
    if (a.slice(0, 7) === b.slice(0, 7)) return dayOf(a) + " – " + +b.slice(8, 10);
    return dayOf(a) + " – " + dayOf(b) + (a.slice(0, 4) === b.slice(0, 4) ? "" : " " + b.slice(0, 4));
  }
  // the "built" fact on a project page: still being worked on, or the months it took
  function built(p) {
    var t = timeline && timeline.projects[p.repo];
    if (!t) return "";
    var y = t.last.slice(0, 4);
    if (Date.now() - utc(t.last) < 21 * 864e5) return "Since " + monthOf(t.first) + " " + t.first.slice(0, 4);
    if (t.first.slice(0, 7) === t.last.slice(0, 7)) return "Built " + monthOf(t.last) + " " + y;
    return "Built " + monthOf(t.first) + (t.first.slice(0, 4) === y ? "" : " " + t.first.slice(0, 4)) + " – " + monthOf(t.last) + " " + y;
  }
  function timelineSection() {
    var rows = all.map(function (p) { return { p: p, t: timeline && timeline.projects[p.repo] }; })
      .filter(function (r) { return r.t && r.t.first && r.t.last; })
      .sort(function (a, b) { return a.t.first < b.t.first ? -1 : a.t.first > b.t.first ? 1 : a.t.last < b.t.last ? -1 : 1; });
    if (!rows.length) return "";
    var lo = rows[0].t.first, hi = rows.reduce(function (m, r) { return r.t.last > m ? r.t.last : m; }, "");
    var start = Date.UTC(+lo.slice(0, 4), +lo.slice(5, 7) - 1, 1);
    var end = Date.UTC(+hi.slice(0, 4), +hi.slice(5, 7), 1);
    var at = function (t) { return ((t - start) / (end - start) * 100).toFixed(3) + "%"; };
    var dayW = (864e5 / (end - start) * 100).toFixed(3) + "%";
    var months = [];
    for (var m = new Date(start); m < end; m.setUTCMonth(m.getUTCMonth() + 1)) months.push(new Date(m));
    var lines = months.slice(1).map(function (m) { return '<span class="tl-line" style="left:' + at(+m) + '"></span>'; }).join("");
    var axis = months.map(function (m, i) {
      var label = MON[m.getUTCMonth()] + (i === 0 || m.getUTCMonth() === 0 ? " " + m.getUTCFullYear() : "");
      return '<span style="left:' + at(+m) + '">' + label + "</span>";
    }).join("");
    var howLong = months.length === 1 ? "one month" : months.length + " months";
    return '<section class="wrap timeline" id="timeline" aria-labelledby="timelineTitle">' +
      '<div class="section-title"><h2 id="timelineTitle">Timeline</h2></div>' +
      '<p class="section-sub">' + rows.length + " projects over " + howLong + ", from each one’s commit history. Each mark is a day of work.</p>" +
      '<div class="tl"><div class="tl-head" aria-hidden="true"><span></span><div class="tl-axis">' + axis + "</div><span></span></div>" +
      '<ol class="tl-rows">' + rows.map(function (r) {
        var t = r.t, days = Object.keys(t.days || {}).sort();
        var ticks = days.map(function (d) {
          var n = t.days[d];
          return '<i style="left:' + at(utc(d)) + ";width:" + dayW + '" title="' + dayOf(d) + ": " + n + (n === 1 ? " commit" : " commits") + '"></i>';
        }).join("");
        return '<li class="tl-row"' + vars(r.p) + '><a class="tl-name" href="#' + r.p.slug + '">' + esc(r.p.name) + "</a>" +
          '<div class="tl-track" aria-hidden="true">' + lines +
            '<span class="tl-bar" style="left:' + at(utc(t.first)) + ";width:calc(" + at(utc(t.last)) + " - " + at(utc(t.first)) + " + " + dayW + ')"></span>' + ticks + "</div>" +
          '<span class="tl-meta">' + span(t.first, t.last) + " · " + t.commits + (t.commits === 1 ? " commit" : " commits") + "</span></li>";
      }).join("") + "</ol></div></section>";
  }

  // ---------- editing the text in place ----------
  // Every editable element carries data-edit="<repo>|<path in its JSON>". Changes wait in
  // `pending` (surviving moves between pages) until Save commits them, one commit per repo.
  // The GitHub token lives only in memory: a reload ends edit mode.
  var editing = false, ghToken = "", pending = {}, note = "", bar = null;
  // ?edit-preview on a local copy shows edit mode without signing in (Save won't work)
  if (!LIVE && /[?&]edit-preview/.test(location.search)) editing = true;
  var LIMITS = { headline: 90, intro: 600, tagline: 40, pitch: 120, problem: 70, "problem.headline": 70,
    value: 8, label: 45, title: 25, text: 80, details: 70, worksOn: 30, data: 30, builtWith: 30 };
  function ed(repo, path) {
    if (!editing) return "";
    var leaf = path.split(".").filter(function (s) { return !/^\d+$/.test(s); }).pop();
    return ' data-edit="' + esc(repo + "|" + path) + '" data-max="' + (LIMITS[path] || LIMITS[leaf] || 200) + '"';
  }
  var source = function (repo) { return repo === SITE ? site : byRepo[repo] && byRepo[repo].d; };
  var getPath = function (o, path) { return path.split(".").reduce(function (v, k) { return v == null ? v : v[k]; }, o); };
  function setPath(o, path, value) {
    var keys = path.split(".");
    keys.slice(0, -1).forEach(function (k, i) {
      if (o[k] == null || typeof o[k] !== "object") o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      o = o[k];
    });
    o[keys[keys.length - 1]] = value;
  }
  var splitKey = function (k) { var i = k.indexOf("|"); return [k.slice(0, i), k.slice(i + 1)]; };
  var clean = function (el) { return el.textContent.replace(/\s+/g, " ").trim(); };

  function armEditor() {
    if (!editing) return;
    main.querySelectorAll("[data-edit]").forEach(function (el) {
      el.setAttribute("contenteditable", "plaintext-only");
      if (!el.isContentEditable) el.setAttribute("contenteditable", "true");
      var k = splitKey(el.dataset.edit), v = getPath(source(k[0]), k[1]);
      // the full text, not the trimmed copy the page shows
      el.textContent = pending[el.dataset.edit] != null ? pending[el.dataset.edit] : typeof v === "string" ? v : el.textContent;
      mark(el);
    });
    showBar();
  }
  function mark(el) {
    el.classList.toggle("edited", pending[el.dataset.edit] != null);
    el.classList.toggle("over", clean(el).length > +el.dataset.max);
  }
  main.addEventListener("input", function (e) {
    var el = e.target.closest && e.target.closest("[data-edit]");
    if (!el) return;
    var k = splitKey(el.dataset.edit), orig = getPath(source(k[0]), k[1]), v = clean(el);
    if (v === String(orig == null ? "" : orig).trim()) delete pending[el.dataset.edit];
    else pending[el.dataset.edit] = v;
    // the same text may be on the page twice (a featured project is also in the grid)
    main.querySelectorAll('[data-edit="' + CSS.escape(el.dataset.edit) + '"]').forEach(function (x) {
      if (x !== el) x.textContent = v;
      mark(x);
    });
    note = "";
    showBar();
  });
  main.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.closest && e.target.closest("[data-edit]")) { e.preventDefault(); e.target.blur(); }
  });
  main.addEventListener("paste", function (e) {
    if (!(e.target.closest && e.target.closest("[data-edit]"))) return;
    e.preventDefault();
    document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain").replace(/\s+/g, " "));
  });
  // editable text inside a link (cards, featured rows): clicking it edits instead of opening
  document.addEventListener("click", function (e) {
    if (editing && e.target.closest && e.target.closest("[data-edit]")) e.preventDefault();
  }, true);
  window.addEventListener("beforeunload", function (e) {
    if (editing && Object.keys(pending).length) { e.preventDefault(); e.returnValue = ""; }
  });

  function showBar() {
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "editbar";
      bar.setAttribute("role", "region");
      bar.setAttribute("aria-label", "Editing");
      bar.innerHTML = '<span class="eb-msg" aria-live="polite"></span><div class="eb-actions">' +
        '<button type="button" class="btn" data-eb="discard">Discard</button>' +
        '<button type="button" class="btn solid" data-eb="save">Save</button>' +
        '<button type="button" class="btn" data-eb="done">Done</button></div>';
      bar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-eb]");
        if (!b) return;
        if (b.dataset.eb === "save") save();
        if (b.dataset.eb === "discard") { pending = {}; note = ""; route(); }
        if (b.dataset.eb === "done") {
          var n = Object.keys(pending).length;
          if (n && !confirm("Throw away " + n + (n === 1 ? " unsaved change?" : " unsaved changes?"))) return;
          editing = false; ghToken = ""; pending = {}; note = "";
          bar.remove(); bar = null; document.body.classList.remove("editing");
          route();
        }
      });
      document.body.appendChild(bar);
      document.body.classList.add("editing");
    }
    var n = Object.keys(pending).length, overs = main.querySelectorAll("[data-edit].over"), over = overs.length;
    bar.querySelector(".eb-msg").textContent = note ||
      (over ? "Too long for the layout: " + clean(overs[0]).length + " characters where " + overs[0].dataset.max + " fit" +
        (over > 1 ? " (and " + (over - 1) + " more in red)" : "") :
        n ? n + (n === 1 ? " unsaved change" : " unsaved changes") : "Click any outlined text to change it");
    bar.querySelector('[data-eb="save"]').disabled = !n || over > 0 || note === "Saving…";
    bar.querySelector('[data-eb="discard"]').disabled = !n;
  }

  function gh(path, opts) {
    return fetch("https://api.github.com/" + path, Object.assign({
      headers: { Authorization: "Bearer " + ghToken, Accept: "application/vnd.github+json" }
    }, opts)).then(function (r) {
      if (r.ok) return r.json();
      return r.json().catch(function () { return {}; }).then(function (b) {
        var e = new Error(b.message || "GitHub said " + r.status); e.status = r.status; throw e;
      });
    });
  }
  function decode(b64) {
    var bin = atob(b64.replace(/\s/g, "")), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encode(text) {
    var bytes = new TextEncoder().encode(text), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  // Commits one repo's changes. Each value is swapped in where it sits in the file, so the
  // file keeps its hand formatting; if a value can't be found exactly once, it's rewritten.
  function commit(repo, changes) {
    var files = repo === SITE ? ["site.json"] : ["overview/overview.json", "public/overview/overview.json"];
    var get = function (i) {
      return gh("repos/" + OWNER + "/" + repo + "/contents/" + files[i]).then(function (f) { return { path: files[i], f: f }; }, function (e) {
        if (e.status === 404 && i + 1 < files.length) return get(i + 1);
        throw e;
      });
    };
    return get(0).then(function (got) {
      var text = decode(got.f.content), obj = JSON.parse(text), out = text;
      Object.keys(changes).forEach(function (path) {
        var old = getPath(obj, path), lit = JSON.stringify(old);
        setPath(obj, path, changes[path]);
        if (out !== null && typeof old === "string" && out.split(lit).length === 2) {
          out = out.replace(lit, function () { return JSON.stringify(changes[path]); });
        } else out = null;
      });
      if (out === null || JSON.stringify(JSON.parse(out)) !== JSON.stringify(obj)) out = JSON.stringify(obj, null, 2) + "\n";
      var n = Object.keys(changes).length;
      return gh("repos/" + OWNER + "/" + repo + "/contents/" + got.path, {
        method: "PUT",
        body: JSON.stringify({ message: "Edit " + (n === 1 ? "the " + Object.keys(changes)[0] : n + " bits of text") + " from the portfolio", content: encode(out), sha: got.f.sha })
      });
    });
  }
  function save() {
    var byRepoChanges = {};
    Object.keys(pending).forEach(function (k) { var s = splitKey(k); (byRepoChanges[s[0]] = byRepoChanges[s[0]] || {})[s[1]] = pending[k]; });
    note = "Saving…"; showBar();
    Object.keys(byRepoChanges).reduce(function (chain, repo) {
      return chain.then(function () {
        return commit(repo, byRepoChanges[repo]).then(function () {
          Object.keys(byRepoChanges[repo]).forEach(function (path) {
            setPath(source(repo), path, byRepoChanges[repo][path]);
            delete pending[repo + "|" + path];
          });
        });
      });
    }, Promise.resolve()).then(function () {
      note = "Saved. The live site catches up in a minute or two."; route();
    }, function (e) {
      note = "Couldn’t save: " + e.message; route();
    });
  }
  // GitHub access comes through the same Firebase sign-in as the stats: a GitHub popup that
  // asks for repo access. If GitHub is already tied to another sign-in, its token still comes back.
  function startEditing(fb) {
    var pr = new fb.auth.GithubAuthProvider();
    pr.addScope("public_repo");
    var u = fb.auth().currentUser;
    var linked = u && u.providerData.some(function (x) { return x.providerId === "github.com"; });
    var go = !u ? fb.auth().signInWithPopup(pr) : linked ? u.reauthenticateWithPopup(pr) : u.linkWithPopup(pr);
    return go.then(function (r) { return r.credential; }, function (e) { if (e.credential) return e.credential; throw e; })
      .then(function (c) {
        if (!c || !c.accessToken) throw new Error("GitHub didn’t give access.");
        ghToken = c.accessToken;
        return gh("user");
      }).then(function (me) {
        if (String(me.login).toLowerCase() !== OWNER) { ghToken = ""; throw new Error("that GitHub account isn’t " + OWNER + "."); }
        editing = true;
        location.hash = "";
      });
  }

  // ---------- views, for you only ----------
  var fbReady = null;
  function firebase() {
    if (!fbReady) {
      var load = function (src) {
        return new Promise(function (ok, no) {
          var el = document.createElement("script");
          el.src = "https://cdn.jsdelivr.net/npm/firebase@10.14.1/" + src; el.async = false;
          el.onload = ok; el.onerror = no; document.head.appendChild(el);
        });
      };
      fbReady = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"]
        .reduce(function (p, s) { return p.then(function () { return load(s); }); }, Promise.resolve())
        .then(function () { if (!window.firebase.apps.length) window.firebase.initializeApp(FIREBASE); return window.firebase; });
    }
    return fbReady;
  }
  function when(t) {
    if (!t) return "";
    var days = Math.floor((Date.now() - t) / 864e5), dt = new Date(t);
    return days < 1 ? "today " + dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      : days < 2 ? "yesterday" : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function renderStats() {
    document.title = "Views · " + (site.name || "");
    try { localStorage.setItem(ME, "1"); } catch (e) {}
    main.innerHTML = '<section class="wrap stats"><a class="back" href="./">' + BACK + "Projects</a>" +
      "<h1>Views</h1><p class=\"lead\">Only you can see these. This browser's own visits aren't counted.</p>" +
      '<div class="edit-cta"><button type="button" class="btn" id="editBtn">Edit the text</button>' +
      "<span>Change the words on the site in place. Saving commits them to GitHub.</span></div>" +
      '<div id="statsBody"><p class="loading">Checking you’re signed in…</p></div></section>';
    var body = function (h) { var el = document.getElementById("statsBody"); if (el) el.innerHTML = h; };
    document.getElementById("editBtn").addEventListener("click", function () {
      var b = this, tip = b.nextElementSibling;
      b.disabled = true;
      firebase().then(startEditing).catch(function (e) {
        b.disabled = false;
        tip.textContent = "Couldn’t start editing: " + (e.message || e.code);
      });
    });
    firebase().then(function (fb) {
      fb.auth().onAuthStateChanged(function (user) {
        if (!user) {
          body('<p class="lead" style="margin-top:20px">Sign in with the account your launchpad uses.</p>' +
            '<div class="p-actions"><button class="btn solid" data-in="google">Sign in with Google</button>' +
            '<button class="btn" data-in="github">Sign in with GitHub</button></div>');
          main.querySelectorAll("[data-in]").forEach(function (b) {
            b.addEventListener("click", function () {
              var pr = b.dataset.in === "github" ? new fb.auth.GithubAuthProvider() : new fb.auth.GoogleAuthProvider();
              fb.auth().signInWithPopup(pr).catch(function (e) { body('<p class="lead">' + esc(e.message) + "</p>"); });
            });
          });
          return;
        }
        fb.firestore().collection("showcase_visits").orderBy("at", "desc").limit(5000).get().then(function (snap) {
          var home = {}, proj = {}, total = 0, month = 0, cutoff = Date.now() - 30 * 864e5;
          var add = function (m, key, at) { var r = m[key] || (m[key] = { n: 0, last: 0 }); r.n++; if (at > r.last) r.last = at; };
          snap.docs.forEach(function (doc) {
            var v = doc.data(), k = String(v.k || ""), at = v.at && v.at.toMillis ? v.at.toMillis() : 0;
            if (k === "pf" || k.indexOf("pf-") === 0) { add(home, k === "pf" ? "" : k.slice(3), at); total++; if (at > cutoff) month++; }
            else if (k.indexOf("pp-") === 0) add(proj, k.slice(3), at);
          });
          var rows = function (m, label) {
            var keys = Object.keys(m).sort(function (a, b) { return m[b].n - m[a].n; });
            return keys.length ? "<table><thead><tr><th>" + label + '</th><th style="text-align:right">Views</th><th>Last</th></tr></thead><tbody>' +
              keys.map(function (key) {
                var name = label === "Project" ? (bySlug[key] ? bySlug[key].name : key) : (key ? "for=" + key : "Direct, no tag");
                return "<tr><td>" + esc(name) + '</td><td class="n">' + m[key].n + "</td><td>" + when(m[key].last) + "</td></tr>";
              }).join("") + "</tbody></table>" : '<p class="lead" style="margin-top:12px">None yet.</p>';
          };
          body('<div class="stat-row"><div><b>' + total + "</b><span>visits to the home page</span></div>" +
            "<div><b>" + month + "</b><span>in the last 30 days</span></div>" +
            "<div><b>" + Object.keys(home).filter(Boolean).length + "</b><span>tagged links opened</span></div></div>" +
            "<h2>Who it came from</h2>" + rows(home, "Link") +
            "<h2>Project pages</h2>" + rows(proj, "Project") +
            '<p class="lead" style="margin-top:28px">Tag a link to see where views come from: <code>' +
            esc(location.origin + location.pathname) + "?for=acme</code>. A tag is lowercase letters, numbers and dashes.</p>");
        }, function (e) {
          body('<p class="lead">Couldn’t read the views (' + esc(e.code || e.message) + "). If you just signed in with a different account, it needs to be the one in the Firestore rule.</p>");
        });
      });
    }, function () { body('<p class="lead">Couldn’t load the sign-in library. Check the connection and try again.</p>'); });
  }
})();
