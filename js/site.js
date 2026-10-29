/* Projects · Jen
   A portfolio built from each project's own overview (<repo>/overview/overview.json),
   so nothing here is copied: edit an overview and this site follows. What's shown, in
   what order and what's featured is site.json.

   Pages (one HTML file, routed by the hash):
     ./                 home: intro, featured projects, every project with filters
     ./#recipe-book     a project, laid out from its overview
     ./#stats           views, for the signed-in owner only (not linked anywhere)

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

  var main = document.getElementById("main");
  var site = null, all = [], bySlug = {}, groups = {}, filter = "all";

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
    all = items.filter(Boolean);
    all.forEach(function (p) { bySlug[p.slug] = p; });
    route();
    window.addEventListener("hashchange", route);
  }).catch(function () {
    main.innerHTML = '<p class="loading wrap">Something went wrong loading the projects. Try again in a moment.</p>';
  });

  function route() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h === "stats") return renderStats();
    if (bySlug[h]) return renderProject(bySlug[h]);
    renderHome(h);
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
        "<h1>" + esc(site.headline || "") + "</h1>" +
        (site.intro ? "<p>" + esc(site.intro) + "</p>" : "") +
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
      "</section>";
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
    var points = list(p.d.features, 3).map(function (f) { return str(f && f.title, 40); }).filter(Boolean);
    return '<a class="feature" href="#' + p.slug + '" data-slug="' + p.slug + '"' + vars(p) + ">" +
      '<div class="feature-shot' + (shot && shot.frame === "phone" ? " phone" : "") + '">' + img(p, shot) + "</div>" +
      '<div class="feature-text">' +
        '<span class="eyebrow"><i></i>' + esc(groups[p.group] || "") + "</span>" +
        "<h3>" + esc(p.name) + "</h3>" +
        '<p class="tagline">' + esc(str(p.d.tagline, 60)) + "</p>" +
        '<p class="pitch">' + esc(str(p.d.pitch, 200)) + "</p>" +
        (points.length ? '<ul class="feature-points">' + points.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "") +
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
          "<h3>" + esc(p.name) + "</h3><p>" + esc(str(p.d.tagline, 60)) + "</p></div></a></li>";
    }).join("");
  }

  // ---------- a project ----------
  function renderProject(p) {
    lastSlug = p.slug;
    var d = p.d, screens = list(d.screens, 3), i = all.indexOf(p);
    var prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
    document.title = p.name + " · " + (site.name || "");
    var f = d.facts || {};
    var facts = [f.worksOn, f.data, f.builtWith, str(f.started) ? "Since " + str(f.started) : ""].map(function (x) { return str(x, 40); }).filter(Boolean);
    var problem = str(d.problem, 100) || (d.problem && str(d.problem.headline, 100)) || "";
    var stats = list(d.stats, 3).filter(function (s) { return s && str(s.value); });
    var features = list(d.features, 4).filter(function (x) { return x && str(x.title); });
    var details = function (x) {
      var items = list(x.details, 3).map(function (t) { return str(t, 90); }).filter(Boolean);
      return items.length ? '<ul class="feature-points">' + items.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" : "";
    };
    var html = '<div class="wrap"' + vars(p) + ">" +
      '<a class="back" href="./#work">' + BACK + "All projects</a>" +
      '<section class="p-hero"><div>' +
        '<span class="eyebrow"><i></i>' + esc(groups[p.group] || "") + (str(d.status, 30) ? " · " + esc(str(d.status, 30)) : "") + "</span>" +
        "<h1>" + esc(p.name) + "</h1>" +
        (str(d.tagline) ? '<p class="tagline">' + esc(str(d.tagline, 60)) + "</p>" : "") +
        (str(d.pitch) ? '<p class="pitch">' + esc(str(d.pitch, 200)) + "</p>" : "") +
        '<div class="p-actions"><a class="btn accent" href="' + esc(p.url) + '">Open the app ' + OUT + "</a>" +
          '<a class="btn" href="https://github.com/jkw2lo/' + esc(p.repo) + '">Source</a></div>' +
        (facts.length ? '<ul class="p-facts">' + facts.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "") +
      "</div>" +
      (screens[0] ? '<div class="frame' + (screens[0].frame === "phone" ? " phone" : "") + '">' + img(p, screens[0], "eager") + "</div>" : "") +
      "</section>";
    if (problem || stats.length) {
      html += '<section class="band">' +
        (problem ? '<div><span class="eyebrow">Why it exists</span><h2>' + esc(problem) + "</h2></div>" : "<div></div>") +
        (stats.length ? '<div class="band-stats">' + stats.map(function (s) {
          return "<div><b>" + esc(str(s.value, 12)) + "</b><span>" + esc(str(s.label, 50)) + "</span></div>";
        }).join("") + "</div>" : "") + "</section>";
    }
    if (features.length) {
      html += '<section class="p-features" aria-label="Key features">';
      var cards = [], rows = 0;
      var flush = function () {
        if (!cards.length) return;
        html += '<div class="p-cards">' + cards.map(function (x) {
          return "<div><h3>" + esc(str(x.title, 30)) + "</h3>" + (str(x.text) ? "<p>" + esc(str(x.text, 100)) + "</p>" : "") + details(x) + "</div>";
        }).join("") + "</div>";
        cards = [];
      };
      features.forEach(function (x) {
        var shot = x.screen && img(p, x.screen);
        if (!shot) { cards.push(x); return; }
        flush();
        html += '<div class="p-feature' + (rows++ % 2 ? " flip" : "") + '"><div>' +
          "<h3>" + esc(str(x.title, 30)) + "</h3>" + (str(x.text) ? "<p>" + esc(str(x.text, 100)) + "</p>" : "") + details(x) + "</div>" +
          '<div class="shot frame' + (x.screen.frame === "phone" ? " phone" : "") + '">' + shot + "</div></div>";
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
      '<div id="statsBody"><p class="loading">Checking you’re signed in…</p></div></section>';
    var body = function (h) { var el = document.getElementById("statsBody"); if (el) el.innerHTML = h; };
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
