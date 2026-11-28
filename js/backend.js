/* ------------------------------------------------------------------
   Backend settings and the small helpers every public page shares.

   1. The two values below come from the hosted backend's API settings
      (ADMIN.md, step 6). Both are designed to be public: the database's
      row level security rules decide what this key may do.
      NEVER put the service_role key or a secret key in this file, or
      anywhere else in this repository. The repository is public.
   2. While the values are the placeholders, the site works exactly as it
      did before: content from js/config.js, the contact form opens the
      visitor's email app, and no visit statistics are sent.

   What this file does when the backend is set:
   - content: renders at once from js/config.js plus the copy fetched on
     the visitor's last page view (kept in localStorage), then fetches the
     current copy in the background (see main.js for when it is swapped in);
   - the contact form: sends the message to the `messages` table;
   - visit statistics: a few anonymous events (page view, film play, reel
     mode opened, quote button), no IP address, no cookies, no
     fingerprinting, and nothing at all when the browser asks not to be
     tracked (Do Not Track or Global Privacy Control).
------------------------------------------------------------------- */
window.KHULDULI_BACKEND = (function () {
  "use strict";

  var SUPABASE_URL = "https://estczloscnxcpxwsednv.supabase.co";
  var SUPABASE_ANON_KEY = "sb_publishable_hrNBqb82p_AFupct9ZU9bg_ET98nP87";

  var URL_ = String(SUPABASE_URL).replace(/\/+$/, "");
  var KEY = String(SUPABASE_ANON_KEY);
  var configured = /^https:\/\/[^\s/]+$/.test(URL_) && !/YOUR[-_]/.test(URL_ + KEY) && KEY.length > 20;

  var CACHE_KEY = "khulduli-content";
  var SID_KEY = "khulduli-sid";
  var ADMIN_SESSION_KEY = "khulduli-admin-session";
  var DRAFT_KEY = "khulduli-admin-draft";
  var CONTENT_TIMEOUT = 2500;
  var SEND_TIMEOUT = 10000;

  /* ---------- the rules content must follow (shared with the admin page) ---------- */
  var RULES = {
    email: /^[^@\s"'<>]+@[^@\s"'<>]+\.[^@\s"'<>]+$/,
    https: /^https:\/\/[^\s"'<>\\]+$/i,
    local: /^\/?assets\/[A-Za-z0-9_\-./]+$/,
    image: /\.(jpe?g|png|webp|avif|gif|svg)(\?.*)?$/i,
    yt: /^[A-Za-z0-9_-]{11}$/,
    tiktok: /^\d{10,25}$/,
    filmId: /^[A-Za-z0-9_-]{1,80}$/,
    hex: /^#[0-9a-f]{3}([0-9a-f]{3})?$/i,
    dash: /[\u2012\u2013\u2014\u2015]/,
    devanagari: /[\u0900-\u097F]/
  };
  var PLATFORMS = ["facebook", "instagram", "tiktok", "youtube"];
  var PLATFORM_NAMES = { facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube" };

  function isJwt(k) { return /^eyJ/.test(k); }
  // Legacy anon keys are JWTs and also go in Authorization. New publishable keys only go in apikey.
  function headers(extra) {
    var h = { apikey: KEY };
    if (isJwt(KEY)) h.Authorization = "Bearer " + KEY;
    for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k];
    return h;
  }

  function withTimeout(ms, run) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer;
    return new Promise(function (resolve, reject) {
      timer = setTimeout(function () { if (ctl) ctl.abort(); reject(new Error("timeout")); }, ms);
      run(ctl ? ctl.signal : undefined).then(resolve, reject);
    }).then(function (v) { clearTimeout(timer); return v; }, function (e) { clearTimeout(timer); throw e; });
  }

  function store(kind) { try { var s = window[kind]; s.getItem("x"); return s; } catch (e) { return null; } }
  var LS = store("localStorage"), SS = store("sessionStorage");
  function readJSON(s, k) { try { var v = s && s.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  /* ---------- content: the copy in the database, checked field by field ----------
     Anything missing or not valid falls back to js/config.js, so a bad value can
     never break the page or put a script on it. */
  function copy(o) { return JSON.parse(JSON.stringify(o)); }
  function str(v, max) { return typeof v === "string" ? v.trim().slice(0, max) : ""; }
  function has(o, k) { return o && typeof o === "object" && Object.prototype.hasOwnProperty.call(o, k); }
  function pair(v, max) { return v && typeof v === "object" ? { en: str(v.en, max), ne: str(v.ne, max) } : null; }
  function num(v, min, max) { return typeof v === "number" && isFinite(v) && v >= min && v <= max ? v : null; }
  function webUrl(v) { v = str(v, 600); return RULES.https.test(v) ? v : ""; }
  function media(v) { v = str(v, 600); return RULES.https.test(v) || (RULES.local.test(v) && v.indexOf("..") < 0) ? v : ""; }

  function film(f) {
    if (!f || typeof f !== "object") return null;
    var o = {
      title: str(f.title, 80), titleEn: str(f.titleEn, 80), en: str(f.en, 200),
      platform: str(f.platform, 40), link: webUrl(f.link),
      video: media(f.video), yt: RULES.yt.test(f.yt) ? f.yt : "", tiktok: RULES.tiktok.test(f.tiktok) ? f.tiktok : "",
      poster: media(f.poster)
    };
    if (!o.title && !o.titleEn) return null;
    if (!o.title) o.title = o.titleEn;
    if (RULES.filmId.test(f.id)) o.id = f.id;
    var result = str(f.result, 16);
    if (result) { o.result = result; o.unit = pair(f.unit, 40) || { en: "views", ne: "भ्युज" }; }
    var extra = str(f.extra, 120); if (extra) o.extra = extra;
    if (Array.isArray(f.tone) && f.tone.length === 2 && RULES.hex.test(f.tone[0]) && RULES.hex.test(f.tone[1])) o.tone = [f.tone[0], f.tone[1]];
    if (f.lead === true) o.lead = true;
    if (f.latest === true) o.latest = true;
    return o;
  }
  function longFilm(f) {
    if (!f || typeof f !== "object") return null;
    var o = {
      title: str(f.title, 120), ne: str(f.ne, 160), tag: pair(f.tag, 80) || { en: "", ne: "" },
      meta: str(f.meta, 120), coords: str(f.coords, 80),
      youtube: RULES.yt.test(f.youtube) ? f.youtube : "", link: webUrl(f.link), poster: media(f.poster)
    };
    if (!o.title || !(o.youtube || o.link)) return null;
    if (!o.link) o.link = "https://www.youtube.com/watch?v=" + o.youtube;
    if (RULES.filmId.test(f.id)) o.id = f.id;
    return o;
  }
  function reachRow(r) {
    if (!r || PLATFORMS.indexOf(r.key) < 0) return null;
    var value = num(r.value, 0, 1e6), dec = num(r.decimals, 0, 3), share = num(r.share, 0, 1);
    if (value === null || dec === null || share === null || dec % 1) return null;
    return { key: r.key, name: str(r.name, 30) || PLATFORM_NAMES[r.key], value: value, decimals: dec,
      suffix: str(r.suffix, 4), share: share, en: str(r.en, 160), ne: str(r.ne, 160) };
  }

  function sanitize(base, raw) {
    var out = copy(base);
    if (!raw || typeof raw !== "object") return out;
    if (RULES.email.test(str(raw.email, 254))) out.email = str(raw.email, 254);
    if (raw.socials && typeof raw.socials === "object") {
      var s = {};
      PLATFORMS.forEach(function (k) {
        if (!has(raw.socials, k)) { if (base.socials && base.socials[k]) s[k] = base.socials[k]; return; }
        var u = webUrl(raw.socials[k]);
        if (u) s[k] = u;
        else if (str(raw.socials[k], 600) && base.socials && base.socials[k]) s[k] = base.socials[k]; // not valid: keep the old link
        // an empty value hides that link
      });
      out.socials = s;
    }
    var note = pair(raw.statsNote, 200); if (note) out.statsNote = note;
    if (raw.headline && typeof raw.headline === "object") {
      var hv = num(raw.headline.value, 0, 1e6), hd = num(raw.headline.decimals === undefined ? 0 : raw.headline.decimals, 0, 3);
      if (hv !== null && hd !== null && hd % 1 === 0) out.headline = { value: hv, suffix: str(raw.headline.suffix, 6), decimals: hd };
    }
    if (Array.isArray(raw.reach)) {
      var rows = raw.reach.slice(0, 4).map(reachRow);
      if (rows.length && rows.every(Boolean)) out.reach = rows;
    }
    // A list that is empty on purpose stays empty; a list where nothing is valid keeps js/config.js.
    function list(v, max, fn, fallback) {
      if (!Array.isArray(v)) return fallback;
      var l = v.slice(0, max).map(fn).filter(Boolean);
      return l.length || !v.length ? l : fallback;
    }
    out.shorts = list(raw.shorts, 40, film, out.shorts);
    out.moreReels = list(raw.moreReels, 60, film, out.moreReels || []);
    if (!out.shorts.length && !(out.moreReels || []).length) { out.shorts = copy(base.shorts); out.moreReels = copy(base.moreReels || []); }
    // Only one film may be the latest.
    var seen = false;
    out.shorts.concat(out.moreReels || []).forEach(function (f) { if (f.latest) { if (seen) delete f.latest; seen = true; } });
    out.longform = list(raw.longform, 20, longFilm, out.longform || []);
    return out;
  }

  function preview() { return /[?&]preview=draft\b/.test(location.search) && !!(LS && LS.getItem(DRAFT_KEY)); }

  // What to render right now, without waiting for the network.
  function initial(base) {
    if (preview()) { var d = readJSON(LS, DRAFT_KEY); if (d && d.content) return sanitize(base, d.content); }
    if (!configured) { try { LS && LS.removeItem(CACHE_KEY); } catch (e) {} return base; }
    var c = readJSON(LS, CACHE_KEY);
    return c && c.url === URL_ && c.content ? sanitize(base, c.content) : base;
  }

  // Fetch the current copy. Calls back only when it arrives in time and is valid.
  function refresh(base, cb) {
    if (!configured || preview() || typeof fetch !== "function") return;
    withTimeout(CONTENT_TIMEOUT, function (signal) {
      return fetch(URL_ + "/rest/v1/site_content?select=content&id=eq.1", { headers: headers({ Accept: "application/json" }), signal: signal, cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
    }).then(function (rows) {
      var raw = rows && rows[0] && rows[0].content;
      if (!raw || typeof raw !== "object") return;
      try { LS && LS.setItem(CACHE_KEY, JSON.stringify({ url: URL_, at: Date.now(), content: raw })); } catch (e) {}
      cb(sanitize(base, raw));
    }).catch(function () { /* slow or down: keep what is on the page */ });
  }

  function same(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; } }

  /* ---------- anonymous visit statistics ---------- */
  var sidMem = null;
  function sessionId() {
    if (sidMem) return sidMem;
    var v = SS && SS.getItem(SID_KEY);
    if (!v || !/^[a-z0-9]{16,40}$/.test(v)) {
      var a = new Uint8Array(16), i;
      if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a); else for (i = 0; i < a.length; i++) a[i] = Math.random() * 256;
      v = ""; for (i = 0; i < a.length; i++) v += (a[i] % 36).toString(36);
      try { SS && SS.setItem(SID_KEY, v); } catch (e) {}
    }
    return (sidMem = v);
  }

  function trackingAllowed() {
    if (!configured || typeof fetch !== "function" || location.protocol === "file:" || preview()) return false;
    var n = navigator;
    if (n.doNotTrack === "1" || n.doNotTrack === "yes" || window.doNotTrack === "1" || n.msDoNotTrack === "1" || n.globalPrivacyControl === true) return false;
    if (n.webdriver) return false; // automated browsers are not visitors
    // The owner's own visits are not counted while signed in to the admin page in this browser.
    if (LS && LS.getItem(ADMIN_SESSION_KEY)) return false;
    return true;
  }
  var allowed = null;

  // Three buckets only: the short side of the screen, and whether it is a touch screen.
  function screenBucket() {
    var sw = (window.screen && screen.width) || window.innerWidth, sh = (window.screen && screen.height) || window.innerHeight;
    if (Math.min(sw, sh) < 600) return "phone";
    return window.matchMedia && matchMedia("(pointer: coarse)").matches ? "tablet" : "desktop";
  }
  function referrerHost() {
    try {
      if (!document.referrer) return null;
      var h = new URL(document.referrer).hostname.toLowerCase();
      return h && h !== location.hostname.toLowerCase() && /^[a-z0-9.-]{1,120}$/.test(h) ? h : null;
    } catch (e) { return null; }
  }
  function filmId(f) {
    if (!f) return null;
    var id = f.id || f.yt || f.youtube || f.tiktok || String(f.titleEn || f.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return RULES.filmId.test(id) ? id.slice(0, 80) : null;
  }

  // type: page_view, film_play, reel_open, quote_click. opts: { film, detail }
  function track(type, opts) {
    if (allowed === null) allowed = trackingAllowed();
    if (!allowed) return;
    opts = opts || {};
    var root = document.documentElement;
    var path = (location.pathname || "/").slice(0, 200);
    var row = {
      type: type, path: path.charAt(0) === "/" ? path : "/" + path.slice(0, 199),
      film: opts.film ? filmId(opts.film) : null,
      detail: opts.detail ? String(opts.detail).slice(0, 80) : null,
      referrer: type === "page_view" ? referrerHost() : null,
      lang: root.dataset.lang === "ne" ? "ne" : "en",
      theme: root.dataset.theme === "light" ? "light" : "dark",
      screen: screenBucket(),
      session_id: sessionId()
    };
    // Sent in the background: never waits, never blocks the page, errors are ignored.
    setTimeout(function () {
      try {
        fetch(URL_ + "/rest/v1/page_events", {
          method: "POST", keepalive: true, mode: "cors", credentials: "omit",
          headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
          body: JSON.stringify(row)
        }).catch(function () {});
      } catch (e) {}
    }, 0);
  }

  /* ---------- the contact form ---------- */
  function sendMessage(m) {
    if (!configured || typeof fetch !== "function") return Promise.reject(new Error("not configured"));
    var row = {
      name: str(m.name, 120), email: str(m.email, 254).toLowerCase(), brand: str(m.brand, 160),
      service: str(m.service, 80), message: str(m.message, 5000), lang: m.lang === "ne" ? "ne" : "en",
      session_id: sessionId()
    };
    return withTimeout(SEND_TIMEOUT, function (signal) {
      return fetch(URL_ + "/rest/v1/messages", {
        method: "POST", credentials: "omit", signal: signal,
        headers: headers({ "Content-Type": "application/json", Prefer: "return=minimal" }),
        body: JSON.stringify(row)
      });
    }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); });
  }

  return {
    configured: configured, url: URL_, key: KEY, headers: headers,
    rules: RULES, platforms: PLATFORMS, platformNames: PLATFORM_NAMES,
    adminSessionKey: ADMIN_SESSION_KEY, draftKey: DRAFT_KEY,
    sanitize: sanitize, initial: initial, refresh: refresh, same: same, isPreview: preview,
    track: track, filmId: filmId, sendMessage: sendMessage, withTimeout: withTimeout
  };
})();
