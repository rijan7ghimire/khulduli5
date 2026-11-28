/* ------------------------------------------------------------------
   खुल्दुली admin (/admin). For the owner only, English only.

   Sign in, keep the session, and read and write the database through
   plain REST calls to the backend set in js/backend.js. No library: the
   calls are few, the page then loads nothing from other sites, and every
   request is easy to follow. The session is kept like the backend's own
   client keeps it by default: in localStorage, refreshed shortly before
   the access token expires, removed on Sign out.

   Every value from the database is put on the page as text (textContent,
   input values), never as HTML, because messages come from the public.
------------------------------------------------------------------- */
(function () {
  "use strict";
  // Never inside someone else's frame.
  if (window.top !== window.self) { document.body.textContent = ""; return; }

  var KB = window.KHULDULI_BACKEND, BASE = window.KHULDULI;
  var R = KB.rules;
  var root = document.documentElement;
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function h(tag, a, kids) {
    var el = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "text") el.textContent = v;
      else if (k === "class") el.className = v;
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), v);
      else if (k === "value" || k === "checked" || k === "hidden" || k === "disabled") el[k] = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
      else el.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  function svg(tag, a, kids) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(a || {}).forEach(function (k) { if (k === "text") el.textContent = a[k]; else el.setAttribute(k, a[k]); });
    (kids || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtNum(n) { return Number(n || 0).toLocaleString("en-US"); }
  var dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  function fmtDate(s) { var d = new Date(s); return isNaN(d) ? "" : dateFmt.format(d); }

  /* ---------- theme (same saved choice as the site) ---------- */
  var themeBtn = $("#theme"), themeMeta = $('meta[name="theme-color"]');
  function applyTheme(t) {
    root.dataset.theme = t;
    themeBtn.setAttribute("aria-pressed", t === "light" ? "true" : "false");
    if (themeMeta) themeMeta.setAttribute("content", t === "light" ? "#f4ede1" : "#070504");
  }
  applyTheme(root.dataset.theme === "light" ? "light" : "dark");
  themeBtn.addEventListener("click", function () {
    var t = root.dataset.theme === "light" ? "dark" : "light";
    try { localStorage.setItem("khulduli-theme", t); } catch (e) {}
    applyTheme(t);
    if (statsData) drawStats();
  });

  /* ---------- toast ---------- */
  var toastEl = $("#toast"), toastT;
  function toast(msg, bad) {
    toastEl.textContent = msg; toastEl.hidden = false;
    toastEl.classList.toggle("is-err", !!bad);
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, bad ? 7000 : 3500);
  }

  /* ---------- screens ---------- */
  function show(id) {
    ["setup", "login", "denied", "app"].forEach(function (s) { $("#" + s).hidden = s !== id; });
    $("#signOut").hidden = !(id === "app" || id === "denied");
  }

  /* =================================================================
     Auth: plain REST calls to the backend's auth endpoints.
  ================================================================= */
  var SKEY = KB.adminSessionKey, session = null;
  function readSession() {
    try { var s = JSON.parse(localStorage.getItem(SKEY)); return s && s.access_token && s.refresh_token ? s : null; } catch (e) { return null; }
  }
  function saveSession(j) {
    session = {
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600),
      email: (j.user && j.user.email) || (session && session.email) || ""
    };
    try { localStorage.setItem(SKEY, JSON.stringify(session)); } catch (e) {}
    return session;
  }
  function dropSession() { session = null; try { localStorage.removeItem(SKEY); } catch (e) {} }

  function authError(msg) { var e = new Error(msg || "Your session has ended. Please sign in again."); e.authLost = true; return e; }

  function authCall(grant, body) {
    return fetch(KB.url + "/auth/v1/token?grant_type=" + grant, {
      method: "POST", headers: KB.headers({ "Content-Type": "application/json" }), body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error_description || j.msg || j.message || "HTTP " + r.status); e.status = r.status; e.code = j.error_code || j.error || ""; throw e; }
        return j;
      });
    });
  }

  var refreshing = null;
  function refreshSession() {
    if (!session) return Promise.reject(authError());
    if (!refreshing) {
      refreshing = authCall("refresh_token", { refresh_token: session.refresh_token })
        .then(saveSession, function (e) {
          if (e.status >= 400 && e.status < 500) { dropSession(); throw authError(); }
          throw e;
        })
        .then(function (s) { refreshing = null; return s; }, function (e) { refreshing = null; throw e; });
    }
    return refreshing;
  }
  function token() {
    if (!session) return Promise.reject(authError());
    if (session.expires_at * 1000 - Date.now() < 60000) return refreshSession().then(function (s) { return s.access_token; });
    return Promise.resolve(session.access_token);
  }

  // A REST call as the signed in user. opts: { body, headers, raw, retried }
  function api(method, path, opts) {
    opts = opts || {};
    return token().then(function (t) {
      var hd = { apikey: KB.key, Authorization: "Bearer " + t };
      if (opts.body !== undefined) hd["Content-Type"] = "application/json";
      Object.keys(opts.headers || {}).forEach(function (k) { hd[k] = opts.headers[k]; });
      return fetch(KB.url + "/rest/v1/" + path, { method: method, headers: hd, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined });
    }).then(function (res) {
      if (res.status === 401 && !opts.retried) {
        return refreshSession().then(function () { var o = Object.assign({}, opts, { retried: true }); return api(method, path, o); });
      }
      if (res.status === 401) { dropSession(); throw authError(); }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error(j.message || "HTTP " + res.status); e.status = res.status; e.code = j.code; throw e;
        });
      }
      if (opts.raw) return res;
      return res.text().then(function (txt) { return txt ? JSON.parse(txt) : null; });
    });
  }

  // Any failed call: a lost session goes back to the sign in screen, the rest is a short message.
  function fail(e, what) {
    if (e && e.authLost) { showLogin(e.message); return; }
    var net = e instanceof TypeError || (e && /fetch|network/i.test(e.message));
    toast((what ? what + ": " : "") + (net ? "the backend could not be reached. Check the connection and try again." : e.message), true);
  }

  /* ---------- sign in, sign out ---------- */
  function showLogin(msg, info) {
    show("login");
    var m = $("#loginMsg");
    m.hidden = !msg; m.textContent = msg || "";
    m.classList.toggle("is-err", !info);
    setTimeout(function () { $("#loginEmail").focus(); }, 0);
  }

  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, m = $("#loginMsg"), btn = $("#loginBtn");
    var email = f.email.value.trim(), pw = f.password.value;
    if (!email || !pw) { m.hidden = false; m.classList.add("is-err"); m.textContent = "Enter the email and the password."; (email ? f.password : f.email).focus(); return; }
    btn.disabled = true; m.hidden = true; m.classList.add("is-err");
    authCall("password", { email: email, password: pw }).then(function (j) {
      saveSession(j);
      f.password.value = "";
      enter();
    }, function (err) {
      m.hidden = false;
      if (err.status === 400 || err.code === "invalid_credentials" || err.code === "invalid_grant") m.textContent = /confirm/i.test(err.message) ? "This account's email is not confirmed yet. Confirm it in the backend dashboard (ADMIN.md, step 4)." : "Wrong email or password.";
      else if (err.status === 429) m.textContent = "Too many attempts. Wait a few minutes, then try again.";
      else if (err instanceof TypeError) m.textContent = "The backend could not be reached. Check the connection and try again.";
      else m.textContent = "Sign in failed: " + err.message;
      f.password.focus();
    }).then(function () { btn.disabled = false; });
  });

  function signOut() {
    if (dirty && !confirm("You have unsaved changes. Sign out anyway?")) return;
    var t = session && session.access_token;
    if (t) fetch(KB.url + "/auth/v1/logout?scope=local", { method: "POST", headers: { apikey: KB.key, Authorization: "Bearer " + t } }).catch(function () {});
    dropSession();
    try { localStorage.removeItem(KB.draftKey); } catch (e) {}
    dirty = false; state = null; statsData = null; msgs = []; current = null;
    $("#editor").textContent = ""; $("#msgList").textContent = ""; $("#stats").textContent = "";
    showLogin("Signed out.", true);
  }
  $("#signOut").addEventListener("click", signOut);
  $("#deniedOut").addEventListener("click", signOut);

  // Signed in: check that this account is on the admin list, then open the dashboard.
  function enter() {
    api("POST", "rpc/is_admin", { body: {} }).then(function (ok) {
      if (ok !== true) {
        show("denied");
        $("#deniedText").textContent = "You are signed in as " + (session && session.email || "this account") +
          ", but that email is not on the admin list, so nothing can be shown or changed. Add it to the admins table (ADMIN.md, step 5), then sign in again.";
        return;
      }
      show("app");
      selectTab(location.hash === "#messages" ? "messages" : location.hash === "#stats" ? "stats" : "content", true);
      loadContent();
      countUnread();
    }).catch(function (e) {
      if (e && e.authLost) showLogin(e.message);
      else { showLogin(); fail(e, "Could not check the account"); }
    });
  }

  /* ---------- tabs ---------- */
  var TABS = ["content", "messages", "stats"], loadedTab = {};
  function selectTab(name, noFocus) {
    TABS.forEach(function (t) {
      var on = t === name, b = $("#t-" + t);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      $("#p-" + t).hidden = !on;
    });
    if (!noFocus) $("#t-" + name).focus();
    history.replaceState(null, "", "#" + name);
    if (name === "messages" && !loadedTab.messages) { loadedTab.messages = 1; loadMessages(true); }
    if (name === "stats" && !loadedTab.stats) { loadedTab.stats = 1; pruneOld(); loadStats(); }
  }
  TABS.forEach(function (t, i) {
    var b = $("#t-" + t);
    b.addEventListener("click", function () { selectTab(t, true); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); selectTab(TABS[(i + d + TABS.length) % TABS.length]); }
    });
  });

  /* =================================================================
     CONTENT
  ================================================================= */
  var state = null, dirty = false;
  // state: { draft, savedJSON, updatedAt, updatedBy, specs: {path: spec}, open: {key: true} }

  var MAX_FILMS = { shorts: 40, moreReels: 60, longform: 20 };
  var FILM = [
    { k: "titleEn", label: "Title, English", req: true, max: 80, en: true },
    { k: "title", label: "Title, Nepali", req: true, max: 80, ne: true },
    { k: "en", label: "Line under the title", max: 200, en: true, wide: true, hint: "One short sentence. Shown in both languages." },
    { k: "platform", label: "Platform label", max: 40, en: true, hint: "For example TikTok, or TikTok + Instagram" },
    { k: "link", label: "Link", type: "url", req: true, hint: "Where the card goes when the film cannot play on the page" },
    { k: "result", label: "Result stamp", max: 16, en: true, hint: "For example 4.1M+. Empty: no stamp." },
    { k: "unit.en", label: "Result unit, English", max: 40, en: true, hint: "For example TikTok views" },
    { k: "unit.ne", label: "Result unit, Nepali", max: 40, ne: true },
    { k: "extra", label: "Small line", max: 120, en: true, hint: "Optional, for example 429K likes" },
    { k: "video", label: "Own video file", type: "media", hint: "assets/reels/name.mp4 or a full https address. Plays first if set." },
    { k: "yt", label: "YouTube id", type: "yt", hint: "Paste the link or the 11 character id" },
    { k: "tiktok", label: "TikTok id", type: "tiktok", hint: "Paste the link or the number at its end" },
    { k: "poster", label: "Poster image", type: "image", hint: "assets/posters/name.jpg or an https address. Empty: designed poster." },
    { k: "id", label: "Film id, for stats", type: "filmid", hint: "Letters, numbers and hyphens. Filled in on save if empty. Keep it once set, or the stats start again for this film." },
    { k: "lead", label: "Star on the card", type: "bool" }
  ];
  var LONG = [
    { k: "title", label: "Title, English", req: true, max: 120, en: true },
    { k: "ne", label: "Title, Nepali", max: 160, ne: true },
    { k: "tag.en", label: "Tag, English", max: 80, en: true, hint: "For example Latest documentary" },
    { k: "tag.ne", label: "Tag, Nepali", max: 80, ne: true },
    { k: "meta", label: "Place and length", max: 120, en: true, hint: "For example Himalaya · 18:04" },
    { k: "coords", label: "Coordinates line", max: 80, en: true, hint: "For example 27.83°N 86.72°E · KHUMBU" },
    { k: "youtube", label: "YouTube id", type: "yt", req: true, hint: "Paste the link or the 11 character id" },
    { k: "link", label: "Link", type: "url", hint: "Empty: the YouTube page of the id above" },
    { k: "poster", label: "Poster image", type: "image", hint: "Empty: the YouTube thumbnail" },
    { k: "id", label: "Film id, for stats", type: "filmid", hint: "Filled in on save if empty. Keep it once set." }
  ];
  var REACH = [
    { k: "value", label: "Views", type: "number", req: true, min: 0, step: "any" },
    { k: "decimals", label: "Decimals shown", type: "number", req: true, min: 0, max: 3, int: true },
    { k: "suffix", label: "Suffix", max: 4, en: true, hint: "M, K or empty" },
    { k: "share", label: "Bar length", type: "number", req: true, min: 0, max: 1, step: "any", hint: "0 to 1. The biggest platform is 1." },
    { k: "en", label: "Detail line, English", max: 160, en: true, wide: true },
    { k: "ne", label: "Detail line, Nepali", max: 160, ne: true, wide: true }
  ];

  function getPath(o, path) {
    return path.split(".").reduce(function (a, k) { return a === null || a === undefined ? undefined : a[k]; }, o);
  }
  function setPath(o, path, v) {
    var ks = path.split("."), last = ks.pop();
    var t = ks.reduce(function (a, k) { if (a[k] === null || typeof a[k] !== "object") a[k] = {}; return a[k]; }, o);
    t[last] = v;
  }

  function loadContent() {
    $("#saveState").textContent = "Loading";
    api("GET", "site_content?id=eq.1&select=content,updated_at,updated_by").then(function (rows) {
      var row = rows && rows[0];
      var draft = KB.sanitize(BASE, row ? row.content : null);
      state = { draft: draft, savedJSON: JSON.stringify(draft), updatedAt: row ? row.updated_at : null, updatedBy: row ? row.updated_by : "", specs: {}, open: {}, missing: !row };
      dirty = false;
      offerRestore();
      renderEditor();
      updateBar();
      if (!row) showErr(["The content row is missing in the database, so saving will not work. Run supabase/schema.sql again (it only adds what is missing)."]);
    }).catch(function (e) { $("#saveState").textContent = "Could not load the content"; fail(e, "Loading the content"); });
  }

  // Unsaved changes from an earlier visit are kept in this browser; offer them back.
  function offerRestore() {
    var box = $("#restoreBox"), d;
    try { d = JSON.parse(localStorage.getItem(KB.draftKey)); } catch (e) { d = null; }
    box.hidden = true; box.textContent = "";
    if (!d || !d.content || JSON.stringify(KB.sanitize(BASE, d.content)) === state.savedJSON) return;
    var older = d.base && d.base !== state.updatedAt;
    box.hidden = false;
    box.appendChild(h("p", { text: "This browser kept unsaved changes from " + (d.at ? fmtDate(d.at) : "an earlier visit") + "." +
      (older ? " The content has been saved again since then, so restoring them would undo those later changes." : "") }));
    box.appendChild(h("div", { class: "adm-actions" }, [
      h("button", { class: "btn btn-sm btn-fill", type: "button", text: "Restore them", onclick: function () {
        state.draft = KB.sanitize(BASE, d.content); box.hidden = true; renderEditor(); markDirty();
      } }),
      h("button", { class: "btn btn-sm", type: "button", text: "Discard them", onclick: function () {
        try { localStorage.removeItem(KB.draftKey); } catch (e) {}
        box.hidden = true;
      } })
    ]));
  }

  function updateBar() {
    var s = $("#saveState");
    if (!state) return;
    $("#saveBtn").disabled = !dirty || state.missing;
    $("#discardBtn").disabled = !dirty;
    s.classList.toggle("is-dirty", dirty);
    s.textContent = dirty ? "Unsaved changes" : "Saved" + (state.updatedAt ? " " + fmtDate(state.updatedAt) + (state.updatedBy ? " by " + state.updatedBy : "") : "");
  }

  var draftT;
  function markDirty() {
    dirty = JSON.stringify(state.draft) !== state.savedJSON;
    updateBar();
    clearTimeout(draftT);
    draftT = setTimeout(storeDraft, 300);
  }
  function storeDraft() {
    try {
      if (!dirty) localStorage.removeItem(KB.draftKey);
      else localStorage.setItem(KB.draftKey, JSON.stringify({ base: state.updatedAt, at: new Date().toISOString(), content: state.draft }));
    } catch (e) {}
  }

  /* ---------- the form ---------- */
  function fieldEl(path, spec) {
    var v = getPath(state.draft, path), id = "f-" + path.replace(/\./g, "-");
    state.specs[path] = spec;
    if (spec.type === "bool") {
      return h("div", { class: "adm-field adm-check" }, [h("label", { for: id }, [
        h("input", { type: "checkbox", id: id, checked: v === true, dataset: { path: path } }), " " + spec.label])]);
    }
    var attrs = { id: id, dataset: { path: path }, value: v === undefined || v === null ? "" : String(v), "aria-describedby": id + "-n" + (spec.hint ? " " + id + "-h" : ""), autocomplete: "off" };
    if (spec.type === "number") { attrs.type = "number"; attrs.inputmode = "decimal"; attrs.step = spec.step || "1"; if (spec.min !== undefined) attrs.min = spec.min; if (spec.max !== undefined) attrs.max = spec.max; }
    else if (spec.type === "email") { attrs.type = "email"; attrs.inputmode = "email"; }
    else if (spec.type === "url" || spec.type === "media" || spec.type === "image") { attrs.type = "text"; attrs.inputmode = "url"; attrs.spellcheck = "false"; }
    else { attrs.type = "text"; if (spec.type) attrs.spellcheck = "false"; }
    if (spec.ne) attrs.lang = "ne";
    if (spec.max) attrs.maxlength = spec.max;
    var input = h(spec.type === "textarea" ? "textarea" : "input", attrs);
    return h("div", { class: "adm-field" + (spec.wide ? " wide" : ""), dataset: { field: path } }, [
      h("label", { for: id, text: spec.label + (spec.req ? " *" : "") }), input,
      spec.hint ? h("small", { class: "adm-hint", id: id + "-h", text: spec.hint }) : null,
      h("small", { class: "adm-note", id: id + "-n" })
    ]);
  }

  function section(title, sub, kids) {
    return h("section", { class: "adm-sec" }, [h("h2", { text: title }), sub ? h("p", { class: "adm-sub", text: sub }) : null].concat(kids));
  }
  function grid(kids) { return h("div", { class: "adm-grid" }, kids); }

  function filmLabel(f, i, list) {
    var name = list === "longform" ? (f.title || "New documentary") : (f.titleEn || f.title || "New film");
    return ("0" + (i + 1)).slice(-2) + "  " + name;
  }
  function filmKind(f) {
    return f.video ? "Own video" : f.yt ? "YouTube" : f.tiktok ? "TikTok" : f.youtube ? "YouTube" : "Opens the link";
  }

  function filmList(list) {
    var items = state.draft[list] || [];
    var spec = list === "longform" ? LONG : FILM;
    var ul = h("div", { class: "adm-films" });
    items.forEach(function (f, i) {
      var key = list + "." + i;
      var fields = spec.map(function (s) { return fieldEl(key + "." + s.k, s); });
      var extras = [];
      if (list !== "longform") {
        extras.push(h("div", { class: "adm-field adm-check wide" }, [h("label", {}, [
          h("input", { type: "radio", name: "latest", checked: f.latest === true, dataset: { latest: key } }),
          " The latest film: shown in the frame at the top of the page"])]));
      }
      var acts = h("div", { class: "adm-actions adm-film-acts" }, [
        h("button", { class: "btn btn-sm", type: "button", text: "Move up", disabled: i === 0, dataset: { act: "up", at: key } }),
        h("button", { class: "btn btn-sm", type: "button", text: "Move down", disabled: i === items.length - 1, dataset: { act: "down", at: key } }),
        h("button", { class: "btn btn-sm adm-danger", type: "button", text: "Remove", dataset: { act: "remove", at: key } })
      ]);
      var det = h("details", { class: "adm-film", open: state.open[key] ? true : null, dataset: { key: key } }, [
        h("summary", {}, [
          h("span", { class: "adm-film-name", text: filmLabel(f, i, list) }),
          h("span", { class: "adm-pills" }, [
            f.latest ? h("i", { class: "adm-pill is-hot", text: "Latest" }) : null,
            h("i", { class: "adm-pill", text: filmKind(f) })
          ])
        ]),
        grid(fields.concat(extras)), acts
      ]);
      det.addEventListener("toggle", function () { state.open[key] = det.open; });
      ul.appendChild(det);
    });
    var add = h("button", { class: "btn btn-sm adm-add", type: "button", dataset: { act: "add", at: list },
      text: list === "longform" ? "Add a documentary" : "Add a film", disabled: items.length >= MAX_FILMS[list] });
    return h("div", {}, [ul, add]);
  }

  function renderEditor(focusSel) {
    var ed = $("#editor"), y = window.scrollY;
    state.specs = {};
    ed.textContent = "";
    var d = state.draft;
    ed.appendChild(h("div", { class: "adm-card adm-rules" }, [
      h("b", { text: "Site rules for every text:" }),
      h("span", { text: " no long dashes, no line saying the films are made with AI, no software or company names except TikTok, Instagram, Facebook and YouTube, no prices, and English fields in English only (खुल्दुली is the one exception). Long dashes stop a save; the rest show a warning." })
    ]));

    ed.appendChild(section("Contact", "The email shows in the contact section and on the privacy and terms pages. An empty social link hides it.", [grid([
      fieldEl("email", { label: "Email", type: "email", req: true, max: 254, wide: true }),
      fieldEl("socials.facebook", { label: "Facebook", type: "url" }),
      fieldEl("socials.instagram", { label: "Instagram", type: "url" }),
      fieldEl("socials.tiktok", { label: "TikTok", type: "url" }),
      fieldEl("socials.youtube", { label: "YouTube", type: "url" })
    ])]));

    var reach = (d.reach || []).map(function (r, i) {
      return h("div", { class: "adm-card adm-reach" }, [h("h3", { text: r.name || KB.platformNames[r.key] }),
        grid(REACH.map(function (s) { return fieldEl("reach." + i + "." + s.k, s); }))]);
    });
    ed.appendChild(section("Views and reach", "The big number counts up to its value, then shows its suffix: 22 and M+ reads 22M+.", [
      grid([
        fieldEl("headline.value", { label: "Total views", type: "number", req: true, min: 0, step: "any" }),
        fieldEl("headline.decimals", { label: "Decimals shown", type: "number", req: true, min: 0, max: 3, int: true }),
        fieldEl("headline.suffix", { label: "Suffix", max: 6, en: true, hint: "For example M+" }),
        fieldEl("statsNote.en", { label: "Source line, English", max: 200, en: true, wide: true }),
        fieldEl("statsNote.ne", { label: "Source line, Nepali", max: 200, ne: true, wide: true })
      ]),
      h("div", { class: "adm-reach-grid" }, reach)
    ]));

    ed.appendChild(section("Short films", "The first cards in the row of films, and in reel mode. A film plays on the page from its own video file, else its YouTube id, else its TikTok id; with none it opens its link.", [filmList("shorts")]));
    ed.appendChild(section("More reels", "The rest of the row and of reel mode. Same fields; the result stamp is optional.", [filmList("moreReels")]));
    ed.appendChild(section("Long form", "The documentaries. They play from their YouTube id.", [filmList("longform")]));

    validateAll(false);
    window.scrollTo(0, y);
    if (focusSel) { var f = $(focusSel, ed); if (f) f.focus(); }
  }

  // Pasting a full link into an id field keeps only the id.
  function extractId(type, v) {
    var m;
    v = String(v || "").trim();
    if (type === "yt") m = v.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
    if (type === "tiktok") m = v.match(/\/(?:video|v1)\/(\d{10,25})/);
    return m ? m[1] : v;
  }

  var editor = $("#editor");
  editor.addEventListener("input", function (e) {
    var el = e.target, path = el.dataset && el.dataset.path;
    if (!path) return;
    var spec = state.specs[path] || {};
    var v;
    if (spec.type === "bool") v = el.checked;
    else if (spec.type === "number") v = el.value === "" ? "" : Number(el.value);
    else v = el.value;
    setPath(state.draft, path, v);
    checkField(path);
    if (/\.(titleEn|title)$/.test(path) || /\.(video|yt|tiktok|youtube)$/.test(path)) refreshSummary(path);
    markDirty();
  });
  editor.addEventListener("change", function (e) {
    var el = e.target;
    if (el.dataset && el.dataset.latest) {
      ["shorts", "moreReels"].forEach(function (l) { (state.draft[l] || []).forEach(function (f) { delete f.latest; }); });
      setPath(state.draft, el.dataset.latest + ".latest", true);
      renderEditor('[data-latest="' + el.dataset.latest + '"]');
      markDirty();
      return;
    }
    var path = el.dataset && el.dataset.path, spec = path && state.specs[path];
    if (spec && (spec.type === "yt" || spec.type === "tiktok")) {
      var id = extractId(spec.type, el.value);
      if (id !== el.value) { el.value = id; setPath(state.draft, path, id); checkField(path); refreshSummary(path); markDirty(); }
    }
  });
  editor.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button[data-act]") : null;
    if (!b) return;
    var act = b.dataset.act, at = b.dataset.at;
    if (act === "add") {
      var list = state.draft[at] = state.draft[at] || [];
      list.push(at === "longform"
        ? { title: "", ne: "", tag: { en: "", ne: "" }, meta: "", coords: "", youtube: "", link: "", poster: "" }
        : { title: "", titleEn: "", en: "", platform: "", link: "", video: "", yt: "", tiktok: "", poster: "" });
      state.open[at + "." + (list.length - 1)] = true;
      renderEditor('[data-path="' + at + "." + (list.length - 1) + (at === "longform" ? ".title" : ".titleEn") + '"]');
      markDirty();
      return;
    }
    var parts = at.split("."), name = parts[0], i = parseInt(parts[1], 10), arr = state.draft[name];
    var openAt = function (k) { return !!state.open[name + "." + k]; };
    if (act === "remove") {
      var f = arr[i], label = name === "longform" ? f.title : (f.titleEn || f.title);
      if (!confirm("Remove " + (label ? "“" + label + "”" : "this film") + "? It goes from the site when you save.")) return;
      var flags = arr.map(function (_, k) { return openAt(k); });
      arr.splice(i, 1); flags.splice(i, 1);
      Object.keys(state.open).forEach(function (k) { if (k.indexOf(name + ".") === 0) delete state.open[k]; });
      flags.forEach(function (o, k) { if (o) state.open[name + "." + k] = true; });
      renderEditor('[data-act="add"][data-at="' + name + '"]');
    } else {
      var j = act === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= arr.length) return;
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      var oi = openAt(i), oj = openAt(j);
      state.open[name + "." + i] = oj; state.open[name + "." + j] = oi;
      renderEditor('[data-act="' + act + '"][data-at="' + name + "." + j + '"]:not([disabled])');
    }
    markDirty();
  });

  function refreshSummary(path) {
    var key = path.split(".").slice(0, 2).join("."), det = $('details[data-key="' + key + '"]');
    if (!det) return;
    var list = key.split(".")[0], i = parseInt(key.split(".")[1], 10), f = state.draft[list][i];
    $(".adm-film-name", det).textContent = filmLabel(f, i, list);
    var pills = $$(".adm-pill", det); pills[pills.length - 1].textContent = filmKind(f);
  }

  /* ---------- checks ---------- */
  var ONLY_NE_ALLOWED = /खुल्दुली/g;
  function check(spec, v) {
    if (spec.type === "bool") return {};
    if (spec.type === "number") {
      if (v === "" || v === null || v === undefined) return spec.req ? { error: "Required." } : {};
      if (typeof v !== "number" || !isFinite(v)) return { error: "Enter a number." };
      if (spec.min !== undefined && v < spec.min) return { error: "At least " + spec.min + "." };
      if (spec.max !== undefined && v > spec.max) return { error: "At most " + spec.max + "." };
      if (spec.int && v % 1) return { error: "A whole number." };
      return {};
    }
    var t = String(v === undefined || v === null ? "" : v).trim();
    if (!t) return spec.req ? { error: "Required." } : {};
    if (spec.max && t.length > spec.max) return { error: "At most " + spec.max + " characters." };
    var localOk = R.local.test(t) && t.indexOf("..") < 0;
    switch (spec.type) {
      case "email": return R.email.test(t) ? {} : { error: "Not an email address." };
      case "url": return R.https.test(t) ? {} : { error: "A full address starting with https://" };
      case "media": return R.https.test(t) || localOk ? {} : { error: "A file in assets/ (for example assets/reels/name.mp4) or an https address." };
      case "image":
        if (!(R.https.test(t) || localOk)) return { error: "A file in assets/ (for example assets/posters/name.jpg) or an https address." };
        return R.image.test(t) || /ytimg\.com/.test(t) ? {} : { warn: "This does not look like an image file (.jpg, .png, .webp)." };
      case "yt": return R.yt.test(t) ? {} : { error: "A YouTube id is 11 letters, numbers, - or _. Paste the full link and the id is taken from it." };
      case "tiktok": return R.tiktok.test(t) ? {} : { error: "A TikTok id is the long number at the end of the video link." };
      case "filmid": return R.filmId.test(t) ? {} : { error: "Letters, numbers, - and _ only." };
    }
    if (R.dash.test(t)) return { error: "Long dashes are not used on the site. Use a comma, a colon or a full stop." };
    var warns = [];
    if (spec.en && R.devanagari.test(t.replace(ONLY_NE_ALLOWED, ""))) warns.push("English mode shows no Nepali script except खुल्दुली.");
    if (/\bA\.?I\b|artificial intelligence|एआई/i.test(t)) warns.push("Site rule: no line saying the films are made with AI.");
    if (/(\bRs\.?\s?\d|\bNPR\b|रु\.?\s?\d|[$€£₹]\s?\d|\bUSD\b|\bprice|मूल्य)/i.test(t)) warns.push("Site rule: no prices on the site.");
    return warns.length ? { warn: warns.join(" ") } : {};
  }

  function checkField(path) {
    var spec = state.specs[path];
    if (!spec) return {};
    var r = check(spec, getPath(state.draft, path));
    var wrap = $('[data-field="' + path + '"]', editor);
    if (wrap) {
      wrap.classList.toggle("is-err", !!r.error);
      wrap.classList.toggle("is-warn", !r.error && !!r.warn);
      var n = $(".adm-note", wrap); if (n) n.textContent = r.error || r.warn || "";
      var inp = $("[data-path]", wrap); if (inp) inp.setAttribute("aria-invalid", r.error ? "true" : "false");
    }
    return r;
  }

  // Every field, plus the checks across fields. Returns the lists of errors and warnings.
  function validateAll() {
    var errors = [], warns = [];
    Object.keys(state.specs).forEach(function (p) {
      var r = checkField(p);
      if (r.error) errors.push({ path: p, msg: r.error });
      else if (r.warn) warns.push({ path: p, msg: r.warn });
    });
    var d = state.draft, ids = {};
    ["shorts", "moreReels", "longform"].forEach(function (l) {
      (d[l] || []).forEach(function (f, i) {
        var id = f.id && String(f.id).trim();
        if (!id) return;
        if (ids[id]) errors.push({ path: l + "." + i + ".id", msg: "Film id “" + id + "” is used twice." });
        ids[id] = 1;
      });
    });
    var latest = (d.shorts || []).concat(d.moreReels || []).filter(function (f) { return f.latest; }).length;
    if (!latest) warns.push({ path: "", msg: "No film is marked as the latest, so the first film that can play is shown at the top." });
    if (!(d.shorts || []).length && !(d.moreReels || []).length) errors.push({ path: "", msg: "Keep at least one short film or reel." });
    return { errors: errors, warns: warns };
  }

  function showErr(lines, items) {
    var box = $("#errBox");
    box.textContent = "";
    box.hidden = !lines.length && !(items && items.length);
    lines.forEach(function (l) { box.appendChild(h("p", { text: l })); });
    if (items && items.length) {
      var ul = h("ul");
      items.slice(0, 12).forEach(function (it) {
        var lbl = it.path ? labelFor(it.path) : "";
        ul.appendChild(h("li", {}, [it.path ? h("a", { href: "#", text: lbl, onclick: function (e) { e.preventDefault(); focusPath(it.path); } }) : null, (lbl ? ": " : "") + it.msg]));
      });
      if (items.length > 12) ul.appendChild(h("li", { text: "and " + (items.length - 12) + " more." }));
      box.appendChild(ul);
    }
  }
  function labelFor(path) {
    var spec = state.specs[path] || {}, p = path.split(".");
    var lists = { shorts: "Short film", moreReels: "Reel", longform: "Documentary", reach: "Reach" };
    if (lists[p[0]] && /^\d+$/.test(p[1])) {
      var it = state.draft[p[0]][+p[1]] || {};
      var name = p[0] === "reach" ? (it.name || it.key) : (it.titleEn || it.title || "#" + (+p[1] + 1));
      return lists[p[0]] + " " + name + ", " + (spec.label || p.slice(2).join(".")).toLowerCase();
    }
    return spec.label || path;
  }
  function focusPath(path) {
    var key = path.split(".").slice(0, 2).join("."), det = $('details[data-key="' + key + '"]');
    if (det && !det.open) { det.open = true; state.open[key] = true; }
    var el = $('[data-path="' + path + '"]', editor);
    if (el) { el.scrollIntoView({ block: "center" }); el.focus({ preventScroll: true }); }
  }

  /* ---------- save ---------- */
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60); }
  // Tidy before saving: trim, fill film ids and documentary links and posters.
  function normalised() {
    var d = copy(state.draft), used = {};
    (function trim(o) {
      Object.keys(o).forEach(function (k) {
        if (typeof o[k] === "string") o[k] = o[k].trim();
        else if (o[k] && typeof o[k] === "object") trim(o[k]);
      });
    })(d);
    ["shorts", "moreReels", "longform"].forEach(function (l) { (d[l] || []).forEach(function (f) { if (f.id) used[f.id] = 1; }); });
    ["shorts", "moreReels", "longform"].forEach(function (l) {
      (d[l] || []).forEach(function (f) {
        if (!f.id) {
          // The same id the public pages already count this film under (js/backend.js, filmId).
          var base = KB.filmId(f) || slug(f.titleEn || f.title) || "film", id = base, n = 2;
          while (used[id]) id = base + "-" + n++;
          f.id = id; used[id] = 1;
        }
        if (l === "longform") {
          if (!f.link && f.youtube) f.link = "https://www.youtube.com/watch?v=" + f.youtube;
          if (!f.poster && f.youtube) f.poster = "https://i.ytimg.com/vi/" + f.youtube + "/maxresdefault.jpg";
        } else {
          if (f.result && (!f.unit || (!f.unit.en && !f.unit.ne))) f.unit = { en: "views", ne: "भ्युज" };
          if (!f.result) delete f.unit;
          if (f.lead !== true) delete f.lead;
          if (f.latest !== true) delete f.latest;
        }
      });
    });
    return d;
  }

  var saving = false;
  $("#saveBtn").addEventListener("click", function () {
    if (saving || !state) return;
    var v = validateAll();
    if (v.errors.length) {
      showErr(["Not saved. Fix these first:"], v.errors);
      $("#errBox").scrollIntoView({ block: "nearest" });
      return;
    }
    showErr([]);
    var out = normalised();
    // What the public pages will draw, exactly (the same checks they run).
    var drawn = KB.sanitize(BASE, out);
    saving = true; $("#saveBtn").disabled = true; $("#saveState").textContent = "Saving";
    var q = "site_content?id=eq.1" + (state.updatedAt ? "&updated_at=eq." + encodeURIComponent(state.updatedAt) : "");
    api("PATCH", q, { body: { content: out }, headers: { Prefer: "return=representation" } }).then(function (rows) {
      if (rows && rows.length === 1) {
        state.draft = drawn;
        state.savedJSON = JSON.stringify(drawn);
        state.updatedAt = rows[0].updated_at; state.updatedBy = rows[0].updated_by;
        dirty = false; storeDraft();
        renderEditor();
        toast(v.warns.length ? "Saved, with " + v.warns.length + " warning" + (v.warns.length > 1 ? "s" : "") + ". The site shows it on the next page load." : "Saved. The site shows it on the next page load.");
        if (v.warns.length) showErr(["Saved. Worth a look:"], v.warns);
        return;
      }
      // Nothing was changed: find out why.
      return api("GET", "site_content?id=eq.1&select=updated_at,updated_by").then(function (now) {
        if (!now || !now.length) showErr(["Not saved: the content row is missing in the database. Run supabase/schema.sql again."]);
        else if (now[0].updated_at !== state.updatedAt) showErr(["Not saved: the content was saved somewhere else (" + fmtDate(now[0].updated_at) + (now[0].updated_by ? " by " + now[0].updated_by : "") + ") after you opened it. Your changes are kept in this browser: reload the page, choose Restore, check them, and save again."]);
        else showErr(["Not saved: this account is not allowed to change the content. Check that its email is in the admins table (ADMIN.md, step 5)."]);
      });
    }).catch(function (e) { fail(e, "Not saved"); }).then(function () { saving = false; updateBar(); });
  });

  $("#discardBtn").addEventListener("click", function () {
    if (!dirty || !confirm("Discard all unsaved changes?")) return;
    state.draft = JSON.parse(state.savedJSON);
    dirty = false; storeDraft(); showErr([]);
    renderEditor(); updateBar();
  });

  // Preview: the site, drawn from the unsaved changes kept in this browser.
  $("#previewBtn").addEventListener("click", function () {
    if (!state) return;
    try { localStorage.setItem(KB.draftKey, JSON.stringify({ base: state.updatedAt, at: new Date().toISOString(), content: normalised() })); } catch (e) {}
    window.open("/?preview=draft", "_blank", "noopener");
    if (!dirty) setTimeout(function () { try { localStorage.removeItem(KB.draftKey); } catch (e) {} }, 5000);
  });

  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* =================================================================
     MESSAGES
  ================================================================= */
  var msgs = [], current = null, filter = "all", PAGE = 50, unread = 0;

  function setUnread(n) {
    unread = Math.max(0, n);
    var b = $("#unreadBadge");
    b.hidden = !unread; b.textContent = unread;
    $("#t-messages").setAttribute("aria-label", "Messages" + (unread ? ", " + unread + " unread" : ""));
    $("#msgState").textContent = unread ? unread + " unread" : "Nothing unread";
  }
  function countUnread() {
    api("HEAD", "messages?select=id&read=eq.false", { headers: { Prefer: "count=exact" }, raw: true }).then(function (res) {
      var m = /\/(\d+)$/.exec(res.headers.get("Content-Range") || "");
      if (m) setUnread(parseInt(m[1], 10));
    }).catch(function (e) { if (e && e.authLost) fail(e); });
  }

  function loadMessages(reset) {
    if (reset) { msgs = []; }
    var q = "messages?select=id,created_at,name,email,brand,service,message,lang,read&order=created_at.desc,id.desc&limit=" + PAGE + "&offset=" + msgs.length + (filter === "unread" ? "&read=eq.false" : "");
    $("#msgMore").disabled = true;
    api("GET", q).then(function (rows) {
      msgs = msgs.concat(rows || []);
      $("#msgMore").hidden = !rows || rows.length < PAGE;
      drawList();
      if (reset && current && !msgs.some(function (m) { return m.id === current.id; })) closeMsg();
    }).catch(function (e) { fail(e, "Loading messages"); }).then(function () { $("#msgMore").disabled = false; });
    countUnread();
  }

  function drawList() {
    var ul = $("#msgList");
    ul.textContent = "";
    if (!msgs.length) {
      ul.appendChild(h("li", { class: "adm-empty", text: filter === "unread" ? "No unread messages." : "No messages yet. Messages sent with the contact form appear here." }));
      return;
    }
    msgs.forEach(function (m) {
      var first = String(m.message || "").split(/\n/)[0];
      ul.appendChild(h("li", {}, [h("button", {
        type: "button", class: "adm-row" + (m.read ? "" : " is-unread") + (current && current.id === m.id ? " is-on" : ""),
        "aria-current": current && current.id === m.id ? "true" : null, dataset: { id: m.id },
        onclick: function () { openMsg(m); }
      }, [
        h("span", { class: "adm-row-top" }, [
          m.read ? null : h("i", { class: "adm-dot", "aria-label": "Unread" }),
          h("b", { text: m.name }), h("time", { datetime: m.created_at, text: fmtDate(m.created_at) })
        ]),
        h("span", { class: "adm-row-sub", text: (m.service || "Message") + (m.brand ? " · " + m.brand : "") }),
        h("span", { class: "adm-row-text", text: first.length > 110 ? first.slice(0, 110) + "…" : first })
      ])]));
    });
  }

  function replyHref(m) {
    var subject = "Re: " + (m.service ? "Quote request: " + m.service : "your message to खुल्दुली");
    var quoted = String(m.message || "").split(/\n/).map(function (l) { return "> " + l; }).join("\n");
    var body = "\n\n\nOn " + fmtDate(m.created_at) + ", " + m.name + " wrote:\n" + quoted;
    return "mailto:" + encodeURIComponent(m.email).replace(/%40/g, "@") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  function openMsg(m) {
    current = m;
    var v = $("#msgView");
    v.hidden = false; v.textContent = "";
    $("#msgs").classList.add("is-viewing");
    v.appendChild(h("button", { class: "btn btn-sm adm-back", type: "button", text: "Back to the list", onclick: closeMsg }));
    v.appendChild(h("h2", { tabindex: "-1", text: m.name }));
    var dl = h("dl", { class: "adm-meta" });
    [["Sent", fmtDate(m.created_at)], ["Email", m.email], ["Brand", m.brand], ["Service", m.service], ["Page language", m.lang === "ne" ? "Nepali" : "English"]].forEach(function (r) {
      if (!r[1]) return;
      dl.appendChild(h("dt", { text: r[0] }));
      dl.appendChild(h("dd", {}, [r[0] === "Email" ? h("a", { href: "mailto:" + encodeURIComponent(r[1]).replace(/%40/g, "@"), text: r[1] }) : r[1]]));
    });
    v.appendChild(dl);
    v.appendChild(h("p", { class: "adm-body-text", text: m.message }));
    var readBtn = h("button", { class: "btn btn-sm", type: "button", text: "Mark as unread" });
    readBtn.addEventListener("click", function () { setRead(m, !m.read, readBtn); });
    v.appendChild(h("div", { class: "adm-actions" }, [
      h("a", { class: "btn btn-sm btn-fill", href: replyHref(m), text: "Reply by email" }),
      readBtn,
      h("button", { class: "btn btn-sm adm-danger", type: "button", text: "Delete", onclick: function () { delMsg(m); } })
    ]));
    if (!m.read) setRead(m, true, readBtn); else readBtn.textContent = "Mark as unread";
    drawList();
    $("h2", v).focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 859px)").matches) v.scrollIntoView({ block: "start" });
  }
  function closeMsg() {
    current = null;
    $("#msgView").hidden = true;
    $("#msgs").classList.remove("is-viewing");
    drawList();
  }
  function setRead(m, read, btn) {
    api("PATCH", "messages?id=eq." + m.id, { body: { read: read }, headers: { Prefer: "return=minimal" } }).then(function () {
      if (m.read !== read) setUnread(unread + (read ? -1 : 1));
      m.read = read;
      if (btn) btn.textContent = read ? "Mark as unread" : "Mark as read";
      if (filter === "unread" && read && current !== m) msgs = msgs.filter(function (x) { return x !== m; });
      drawList();
    }).catch(function (e) { fail(e, "Could not update the message"); });
  }
  function delMsg(m) {
    if (!confirm("Delete the message from " + m.name + "? This cannot be undone.")) return;
    api("DELETE", "messages?id=eq." + m.id, { headers: { Prefer: "return=representation" } }).then(function (rows) {
      if (!rows || !rows.length) { toast("Not deleted: this account is not allowed to.", true); return; }
      if (!m.read) setUnread(unread - 1);
      msgs = msgs.filter(function (x) { return x !== m; });
      closeMsg();
      toast("Message deleted.");
    }).catch(function (e) { fail(e, "Could not delete the message"); });
  }

  $$("[data-filter]").forEach(function (b) {
    b.addEventListener("click", function () {
      filter = b.dataset.filter;
      $$("[data-filter]").forEach(function (x) { var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      closeMsg(); loadMessages(true);
    });
  });
  $("#msgRefresh").addEventListener("click", function () { loadMessages(true); });
  $("#msgMore").addEventListener("click", function () { loadMessages(false); });

  /* =================================================================
     STATS
  ================================================================= */
  var days = 30, statsData = null, statsSeq = 0;
  var TZ = (function () { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kathmandu"; } catch (e) { return "Asia/Kathmandu"; } })();

  function pruneOld() { api("POST", "rpc/prune_page_events", { body: {} }).catch(function () {}); }

  function loadStats() {
    var seq = ++statsSeq;
    $("#statState").textContent = "Loading";
    api("POST", "rpc/admin_stats", { body: { days: days, tz: TZ } }).then(function (s) {
      if (seq !== statsSeq) return;
      statsData = s;
      drawStats();
    }).catch(function (e) { if (seq === statsSeq) { $("#statState").textContent = "Could not load the stats"; fail(e, "Loading stats"); } });
  }
  $$("[data-days]").forEach(function (b) {
    b.addEventListener("click", function () {
      days = parseInt(b.dataset.days, 10);
      $$("[data-days]").forEach(function (x) { var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
      loadStats();
    });
  });

  var dayFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
  function fmtDay(s) { var d = new Date(s + "T00:00:00Z"); return isNaN(d) ? s : dayFmt.format(d); }

  // Film ids to titles, from the content as it is now.
  function filmTitle(id) {
    var c = state ? state.draft : BASE, t = null;
    ["shorts", "moreReels", "longform"].forEach(function (l) {
      (c[l] || []).forEach(function (f) { if (!t && KB.filmId(f) === id) t = l === "longform" ? f.title : (f.titleEn || f.title); });
    });
    return t || id;
  }

  function tile(label, n, sub) {
    return h("div", { class: "adm-tile" }, [h("span", { text: label }), h("b", { text: fmtNum(n) }), sub ? h("small", { text: sub }) : null]);
  }

  // One measure, one hue: a horizontal bar per row, the value in text beside it.
  function meters(title, rows, opts) {
    opts = opts || {};
    var total = rows.reduce(function (a, r) { return a + r.n; }, 0), max = rows.reduce(function (a, r) { return Math.max(a, r.n); }, 0);
    var box = h("section", { class: "adm-card adm-meters" }, [h("h3", { text: title })]);
    if (!rows.length) { box.appendChild(h("p", { class: "adm-empty", text: opts.empty || "Nothing yet." })); return box; }
    var ul = h("ul");
    rows.forEach(function (r) {
      var pct = total ? Math.round(r.n / total * 100) : 0;
      var li = h("li", {}, [
        h("span", { class: "adm-m-label", text: r.label }),
        h("span", { class: "adm-m-val", text: fmtNum(r.n) + (opts.pct ? "  " + pct + "%" : "") }),
        h("span", { class: "adm-m-track", "aria-hidden": "true" }, [h("i", { style: "width:" + (max ? Math.max(2, r.n / max * 100) : 0).toFixed(1) + "%" })])
      ]);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    return box;
  }

  function chart(perDay) {
    var wrap = h("figure", { class: "adm-card adm-chart" });
    wrap.appendChild(h("figcaption", {}, [h("h3", { text: "Page views per day" }), h("small", { text: "Days in " + TZ.replace(/_/g, " ") })]));
    var box = h("div", { class: "adm-chart-box" });
    wrap.appendChild(box);
    var tip = h("div", { class: "adm-tip", hidden: true, role: "presentation" });
    box.appendChild(tip);

    var W = Math.max(280, Math.min(1160, (document.querySelector("#stats").clientWidth || 340) - 36)), H = 190;
    var padL = 34, padB = 26, padT = 10, padR = 6, iw = W - padL - padR, ih = H - padT - padB;
    var max = perDay.reduce(function (a, d) { return Math.max(a, d.views); }, 0);
    var top = max <= 4 ? 4 : Math.ceil(max / 4) * 4; // four even steps
    var n = perDay.length, slot = iw / n, gap = n > 40 ? 1 : 2, bw = Math.max(1, slot - gap);
    var s = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
      "aria-label": "Page views per day, " + fmtDay(perDay[0].day) + " to " + fmtDay(perDay[n - 1].day) + ". Highest " + fmtNum(max) + "." });
    for (var g = 0; g <= 4; g++) {
      var gy = padT + ih - ih * g / 4;
      s.appendChild(svg("line", { x1: padL, x2: W - padR, y1: gy, y2: gy, class: g ? "adm-grid-line" : "adm-base-line" }));
      if (g === 0 || g === 2 || g === 4) s.appendChild(svg("text", { x: padL - 6, y: gy + 4, "text-anchor": "end", class: "adm-axis", text: fmtNum(top * g / 4) }));
    }
    perDay.forEach(function (d, i) {
      var x = padL + i * slot + gap / 2, bh = d.views ? Math.max(2, ih * d.views / top) : 0, y = padT + ih - bh, r = Math.min(4, bw / 2, bh);
      if (bh) {
        // rounded at the data end, square on the baseline
        s.appendChild(svg("path", { class: "adm-bar-mark", d: "M" + x + "," + (padT + ih) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + bw - r) + "Q" + (x + bw) + "," + y + " " + (x + bw) + "," + (y + r) + "V" + (padT + ih) + "Z" }));
      }
      var hit = svg("rect", { x: padL + i * slot, y: padT, width: slot, height: ih, class: "adm-hit" }, [svg("title", { text: fmtDay(d.day) + ": " + fmtNum(d.views) + " views, " + fmtNum(d.sessions) + " visits" })]);
      hit.addEventListener("pointerenter", function () {
        tip.hidden = false;
        tip.textContent = "";
        tip.appendChild(h("b", { text: fmtDay(d.day) }));
        tip.appendChild(h("span", { text: fmtNum(d.views) + " views · " + fmtNum(d.sessions) + " visits" }));
        var px = (padL + (i + 0.5) * slot) / W * 100;
        tip.style.left = Math.min(82, Math.max(18, px)) + "%";
        hit.classList.add("is-on");
      });
      hit.addEventListener("pointerleave", function () { tip.hidden = true; hit.classList.remove("is-on"); });
      s.appendChild(hit);
    });
    [0, Math.floor((n - 1) / 2), n - 1].forEach(function (i, k, arr) {
      if (k && i === arr[k - 1]) return;
      s.appendChild(svg("text", { x: padL + (i + 0.5) * slot, y: H - 6, "text-anchor": k === 0 ? "start" : k === 2 ? "end" : "middle", class: "adm-axis", text: fmtDay(perDay[i].day) }));
    });
    box.appendChild(s);
    s.addEventListener("pointerleave", function () { tip.hidden = true; });

    // The same numbers as a table.
    var tbody = h("tbody");
    perDay.slice().reverse().forEach(function (d) { tbody.appendChild(h("tr", {}, [h("td", { text: fmtDay(d.day) }), h("td", { text: fmtNum(d.views) }), h("td", { text: fmtNum(d.sessions) })])); });
    wrap.appendChild(h("details", { class: "adm-table" }, [h("summary", { text: "Show as a table" }),
      h("table", {}, [h("thead", {}, [h("tr", {}, [h("th", { text: "Day" }), h("th", { text: "Page views" }), h("th", { text: "Visits" })])]), tbody])]));
    return wrap;
  }

  var NAMES = {
    lang: { en: "English", ne: "Nepali", "": "Unknown" },
    theme: { dark: "Dark", light: "Light", "": "Unknown" },
    screen: { phone: "Phone", tablet: "Tablet", desktop: "Desktop", "": "Unknown" }
  };
  function named(rows, map) { return (rows || []).map(function (r) { return { label: map[r.k] || r.k, n: r.n }; }); }

  function drawStats() {
    var s = statsData, out = $("#stats");
    if (!s) return;
    out.textContent = "";
    $("#statState").textContent = fmtDay(s.from) + " to " + fmtDay(s.to);
    out.appendChild(h("div", { class: "adm-tiles" }, [
      tile("Page views", s.page_views),
      tile("Visits", s.sessions, "Different tabs that opened the site"),
      tile("Films played", s.film_plays, "In reel mode, full screen or on the platform"),
      tile("Reel mode opened", s.reel_opens),
      tile("Quote buttons", s.quote_clicks)
    ]));
    if (!s.page_views && !s.sessions) out.appendChild(h("p", { class: "adm-card adm-empty", text: "No visits recorded in this range yet. Visits by browsers that ask not to be tracked, and your own visits while signed in here, are not counted." }));
    out.appendChild(chart(s.per_day || []));
    var g = h("div", { class: "adm-stat-grid" }, [
      meters("Films played", (s.films || []).map(function (r) { return { label: filmTitle(r.film), n: r.n }; }), { empty: "No films played in this range." }),
      meters("Where visitors came from", (s.referrers || []).map(function (r) { return { label: r.k || "Direct, or not shared", n: r.n }; }), { pct: true }),
      meters("Pages", (s.pages || []).map(function (r) { return { label: r.k, n: r.n }; })),
      meters("Quote buttons pressed", (s.quote_from || []).map(function (r) { return { label: ({ nav: "Top bar", hero: "Work with us", page: "Other pages" })[r.k] || r.k || "Unknown", n: r.n }; })),
      meters("Phone or desktop", named(s.screen, NAMES.screen), { pct: true }),
      meters("Language", named(s.lang, NAMES.lang), { pct: true }),
      meters("Theme", named(s.theme, NAMES.theme), { pct: true })
    ]);
    out.appendChild(g);
    out.appendChild(h("p", { class: "adm-sub", text: "Visits are counted once each, by the first page they opened. Events older than 12 months are deleted when this tab opens." }));
  }
  var rsT;
  window.addEventListener("resize", function () { clearTimeout(rsT); rsT = setTimeout(function () { if (statsData && !$("#p-stats").hidden) drawStats(); }, 200); });

  /* =================================================================
     Boot
  ================================================================= */
  if (!KB.configured) { show("setup"); return; }
  session = readSession();
  if (session) enter(); else showLogin();
})();
